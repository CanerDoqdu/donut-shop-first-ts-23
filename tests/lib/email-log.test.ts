import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logEmail, updateEmailLogStatus } from '@/lib/email-log';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Mock Supabase Client ───────────────────────────────────

function createMockClient(overrides: {
  insertResult?: { error: unknown };
  updateResult?: { error: unknown };
} = {}) {
  const mockEq = vi.fn().mockResolvedValue(
    overrides.updateResult ?? { error: null }
  );
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = vi.fn().mockResolvedValue(
    overrides.insertResult ?? { error: null }
  );
  const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
  });

  return {
    from: mockFrom,
    _mocks: { mockFrom, mockInsert, mockUpdate, mockEq },
  } as unknown as SupabaseClient & { _mocks: Record<string, ReturnType<typeof vi.fn>> };
}

// ─── Tests ──────────────────────────────────────────────────

describe('logEmail', () => {
  it('inserts a log entry with correct fields', async () => {
    const client = createMockClient();
    const mocks = (client as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

    await logEmail(client, {
      to: 'user@example.com',
      subject: 'Order Confirmed!',
      template: 'order_confirmation',
      status: 'sent',
      resendId: 'msg_123',
      metadata: { orderId: 'ord-1' },
    });

    expect(mocks.mockFrom).toHaveBeenCalledWith('email_logs');
    expect(mocks.mockInsert).toHaveBeenCalledWith({
      to_address: 'user@example.com',
      subject: 'Order Confirmed!',
      template: 'order_confirmation',
      status: 'sent',
      resend_id: 'msg_123',
      metadata: { orderId: 'ord-1' },
      error: null,
    });
  });

  it('defaults status to "sent" and resendId/error to null', async () => {
    const client = createMockClient();
    const mocks = (client as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

    await logEmail(client, {
      to: 'a@b.com',
      subject: 'Test',
      template: 'test',
    });

    expect(mocks.mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'sent',
      resend_id: null,
      error: null,
      metadata: {},
    }));
  });

  it('does not throw when insert fails (graceful degradation)', async () => {
    const client = createMockClient({
      insertResult: { error: { message: 'Table not found' } },
    });

    // Should not throw
    await expect(
      logEmail(client, { to: 'a@b.com', subject: 'X', template: 'test' }),
    ).resolves.not.toThrow();
  });

  it('logs failed emails with error field', async () => {
    const client = createMockClient();
    const mocks = (client as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

    await logEmail(client, {
      to: 'user@example.com',
      subject: 'Order Confirmed!',
      template: 'order_confirmation',
      status: 'failed',
      error: 'SMTP connection refused',
    });

    expect(mocks.mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      error: 'SMTP connection refused',
    }));
  });
});

describe('updateEmailLogStatus', () => {
  it('updates status by resend_id', async () => {
    const client = createMockClient();
    const mocks = (client as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

    await updateEmailLogStatus(client, 'msg_123', 'delivered');

    expect(mocks.mockFrom).toHaveBeenCalledWith('email_logs');
    expect(mocks.mockUpdate).toHaveBeenCalledWith({ status: 'delivered', error: null });
    expect(mocks.mockEq).toHaveBeenCalledWith('resend_id', 'msg_123');
  });

  it('includes error string when status is failed', async () => {
    const client = createMockClient();
    const mocks = (client as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

    await updateEmailLogStatus(client, 'msg_456', 'bounced', 'Mailbox full');

    expect(mocks.mockUpdate).toHaveBeenCalledWith({ status: 'bounced', error: 'Mailbox full' });
  });

  it('does not throw on update failure', async () => {
    const client = createMockClient({
      updateResult: { error: { message: 'Connection lost' } },
    });

    await expect(
      updateEmailLogStatus(client, 'msg_789', 'failed'),
    ).resolves.not.toThrow();
  });
});
