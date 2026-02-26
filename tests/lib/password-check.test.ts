/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkPasswordBreach, getPasswordBreachWarning } from '@/lib/password-check';

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
  return new Uint8Array(bytes).buffer;
}

describe('password-check', () => {
  const hashHex = 'AAAAA' + 'BBBBB'.repeat(7); // 40 hex chars
  const suffix = hashHex.slice(5);

  beforeEach(() => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(hexToBuffer(hashHex)),
      },
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns breach count when suffix is found', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:42\r\nOTHER:1`,
    });

    const count = await checkPasswordBreach('password');
    expect(count).toBe(42);
  });

  it('returns 0 when suffix is not found', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => 'CCCCCC:2\r\nDDDDDD:1',
    });

    const count = await checkPasswordBreach('password');
    expect(count).toBe(0);
  });

  it('throws when HIBP response is not ok', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '',
    });

    await expect(checkPasswordBreach('password')).rejects.toThrow('HIBP API returned 500');
  });

  it('returns warning message when breached', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:101`,
    });

    const message = await getPasswordBreachWarning('password', 'en');
    expect(message).toContain('This password has appeared');
  });

  it('returns null and warns when API fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    const message = await getPasswordBreachWarning('password', 'en');
    expect(message).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns short English warning when count is low (<=100)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:5`,
    });

    const message = await getPasswordBreachWarning('password', 'en');
    expect(message).toBe('This password has been found in known data breaches. Please choose a different password.');
  });

  it('returns Turkish warning for count > 100', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:500`,
    });

    const message = await getPasswordBreachWarning('password', 'tr');
    expect(message).toContain('500');
    expect(message).toContain('veri ihlali');
  });

  it('returns short Turkish warning when count is low (<=100)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:3`,
    });

    const message = await getPasswordBreachWarning('password', 'tr');
    expect(message).toBe('Bu şifre bilinen veri ihlallerinde bulunmuştur. Lütfen farklı bir şifre seçin.');
  });

  it('returns null when password is safe (count = 0)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => 'ZZZZZZ:1',
    });

    const message = await getPasswordBreachWarning('password', 'en');
    expect(message).toBeNull();
  });
});
