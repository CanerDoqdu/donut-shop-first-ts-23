import { describe, it, expect, vi } from 'vitest';
import { previewPromo, applyPromo, rollbackPromo } from '@/lib/promo';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Mock Supabase Client ───────────────────────────────────

function createMockClient(overrides: {
  selectResult?: { data: unknown; error: unknown };
  rpcResult?: { data: unknown; error: unknown };
} = {}) {
  const mockRpc = vi.fn().mockResolvedValue(
    overrides.rpcResult ?? { data: null, error: null }
  );

  const mockSingle = vi.fn().mockResolvedValue(
    overrides.selectResult ?? { data: null, error: { message: 'Not found' } }
  );
  const mockIlike = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    from: mockFrom,
    rpc: mockRpc,
  } as unknown as SupabaseClient;
}

// ─── Base promo data ────────────────────────────────────────

const basePromo = {
  id: '00000000-0000-0000-0000-000000000001',
  code: 'WELCOME10',
  discount_type: 'pct',
  amount: 10,
  min_order: 50,
  max_uses: 100,
  used_count: 5,
  active: true,
  expires_at: '2027-12-31T00:00:00Z',
};

// ─── previewPromo ───────────────────────────────────────────

describe('previewPromo', () => {
  it('returns success with percentage discount', async () => {
    const client = createMockClient({
      selectResult: { data: basePromo, error: null },
    });

    const result = await previewPromo(client, 'WELCOME10', 200);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.discountType).toBe('pct');
      expect(result.discountValue).toBe(20); // 10% of 200
      expect(result.finalTotal).toBe(180);
    }
  });

  it('returns success with flat discount', async () => {
    const client = createMockClient({
      selectResult: {
        data: { ...basePromo, discount_type: 'flat', amount: 25 },
        error: null,
      },
    });

    const result = await previewPromo(client, 'FLAT25', 100);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.discountType).toBe('flat');
      expect(result.discountValue).toBe(25);
      expect(result.finalTotal).toBe(75);
    }
  });

  it('flat discount never exceeds order total', async () => {
    const client = createMockClient({
      selectResult: {
        data: { ...basePromo, discount_type: 'flat', amount: 999, min_order: 0 },
        error: null,
      },
    });

    const result = await previewPromo(client, 'BIG', 10);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.discountValue).toBe(10); // capped at order total
      expect(result.finalTotal).toBe(0);
    }
  });

  it('rejects invalid code', async () => {
    const client = createMockClient(); // default: not found
    const result = await previewPromo(client, 'NOTREAL', 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('INVALID_CODE');
  });

  it('rejects inactive code', async () => {
    const client = createMockClient({
      selectResult: { data: { ...basePromo, active: false }, error: null },
    });
    const result = await previewPromo(client, 'INACTIVE', 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('INACTIVE');
  });

  it('rejects expired code', async () => {
    const client = createMockClient({
      selectResult: {
        data: { ...basePromo, expires_at: '2020-01-01T00:00:00Z' },
        error: null,
      },
    });
    const result = await previewPromo(client, 'EXPIRED', 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('EXPIRED');
  });

  it('rejects depleted code', async () => {
    const client = createMockClient({
      selectResult: {
        data: { ...basePromo, used_count: 100, max_uses: 100 },
        error: null,
      },
    });
    const result = await previewPromo(client, 'USED_UP', 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('DEPLETED');
  });

  it('rejects when order total below min_order', async () => {
    const client = createMockClient({
      selectResult: { data: basePromo, error: null },
    });
    const result = await previewPromo(client, 'WELCOME10', 30); // min_order is 50
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('MIN_ORDER_NOT_MET');
  });
});

// ─── applyPromo ─────────────────────────────────────────────

describe('applyPromo', () => {
  it('returns success from RPC', async () => {
    const client = createMockClient({
      rpcResult: {
        data: [{
          promo_id: basePromo.id,
          discount_type: 'pct',
          discount_value: 20,
          final_total: 180,
          error_reason: null,
        }],
        error: null,
      },
    });

    const result = await applyPromo(client, 'WELCOME10', 200);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.discountValue).toBe(20);
      expect(result.finalTotal).toBe(180);
    }
  });

  it('returns error when RPC returns error_reason', async () => {
    const client = createMockClient({
      rpcResult: {
        data: [{
          promo_id: null,
          discount_type: null,
          discount_value: 0,
          final_total: 200,
          error_reason: 'EXPIRED',
        }],
        error: null,
      },
    });

    const result = await applyPromo(client, 'EXPIRED99', 200);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('EXPIRED');
  });

  it('returns RPC_ERROR when Supabase RPC fails', async () => {
    const client = createMockClient({
      rpcResult: { data: null, error: { message: 'function not found' } },
    });

    const result = await applyPromo(client, 'CODE', 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('RPC_ERROR');
  });
});

// ─── rollbackPromo ──────────────────────────────────────────

describe('rollbackPromo', () => {
  it('calls RPC with correct promo ID', async () => {
    const client = createMockClient({
      rpcResult: { data: null, error: null },
    });

    await rollbackPromo(client, basePromo.id);
    expect(client.rpc).toHaveBeenCalledWith('rollback_promo_code', {
      p_promo_id: basePromo.id,
    });
  });
});
