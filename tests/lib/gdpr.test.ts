import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUserData, exportUserData } from '@/lib/gdpr';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Mock Supabase Client ───────────────────────────────────

function createMockClient(overrides: {
  profileUpdate?: { error: unknown };
  ordersUpdate?: { data: unknown[]; error: unknown };
  loyaltyDelete?: { error: unknown };
  auditInsert?: { error: unknown };
  profileSelect?: { data: unknown; error: unknown };
  ordersSelect?: { data: unknown[]; error: unknown };
  loyaltySelect?: { data: unknown; error: unknown };
} = {}) {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockDelete = vi.fn();
  const mockUpdate = vi.fn();
  const mockInsert = vi.fn();
  const mockOrder = vi.fn();

  // Chain builder
  const chainBuilder = (result: unknown) => {
    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(result);
    chain.order = vi.fn().mockResolvedValue(result);
    return chain;
  };

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    switch (table) {
      case 'profiles':
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(
              overrides.profileUpdate ?? { error: null },
            ),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                overrides.profileSelect ?? {
                  data: { id: 'user-1', full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                },
              ),
            }),
          }),
        };
      case 'orders':
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue(
                overrides.ordersUpdate ?? {
                  data: [{ id: 'ord-1' }, { id: 'ord-2' }],
                  error: null,
                },
              ),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(
                overrides.ordersSelect ?? {
                  data: [
                    { id: 'ord-1', total: 24.99, status: 'paid' },
                    { id: 'ord-2', total: 12.50, status: 'pending' },
                  ],
                  error: null,
                },
              ),
            }),
          }),
        };
      case 'loyalty_points':
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(
              overrides.loyaltyDelete ?? { error: null },
            ),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                overrides.loyaltySelect ?? {
                  data: { user_id: 'user-1', points: 150 },
                  error: null,
                },
              ),
            }),
          }),
        };
      case 'audit_log':
        return {
          insert: vi.fn().mockResolvedValue(
            overrides.auditInsert ?? { error: null },
          ),
        };
      default:
        return { select: vi.fn().mockReturnThis() };
    }
  });

  return { from: mockFrom } as unknown as SupabaseClient;
}

// ─── Tests ──────────────────────────────────────────────────

describe('GDPR deleteUserData', () => {
  it('anonymizes profile, orders, and loyalty points', async () => {
    const client = createMockClient();
    const result = await deleteUserData(client, 'user-1', '127.0.0.1');

    expect(result.success).toBe(true);
    expect(result.anonymizedFields).toContain('full_name');
    expect(result.anonymizedFields).toContain('email');
    expect(result.ordersAnonymized).toBe(2);
  });

  it('returns success even if loyalty delete fails (partial success)', async () => {
    const client = createMockClient({
      loyaltyDelete: { error: { message: 'Table not found' } },
    });

    const result = await deleteUserData(client, 'user-1');
    // Should still succeed — loyalty is non-critical
    expect(result.success).toBe(true);
  });

  it('writes audit log entry', async () => {
    const client = createMockClient();
    await deleteUserData(client, 'user-1', '192.168.1.1');

    // Verify audit_log.insert was called
    expect(client.from).toHaveBeenCalledWith('audit_log');
  });

  it('handles profile anonymize failure gracefully', async () => {
    const client = createMockClient({
      profileUpdate: { error: { message: 'Permission denied' } },
    });

    const result = await deleteUserData(client, 'user-1');
    // Profile fields won't be in anonymizedFields, but overall operation succeeds
    expect(result.success).toBe(true);
    expect(result.anonymizedFields).not.toContain('full_name');
  });
});

describe('GDPR exportUserData', () => {
  it('returns profile, orders, and loyalty data', async () => {
    const client = createMockClient();
    const data = await exportUserData(client, 'user-1');

    expect(data).toHaveProperty('profile');
    expect(data).toHaveProperty('orders');
    expect(data).toHaveProperty('loyaltyPoints');
    expect(data).toHaveProperty('exportedAt');
  });

  it('records export in audit log', async () => {
    const client = createMockClient();
    await exportUserData(client, 'user-1', '10.0.0.1');

    expect(client.from).toHaveBeenCalledWith('audit_log');
  });

  it('returns null profile if not found', async () => {
    const client = createMockClient({
      profileSelect: { data: null, error: null },
    });

    const data = await exportUserData(client, 'user-1');
    expect(data.profile).toBeNull();
  });
});
