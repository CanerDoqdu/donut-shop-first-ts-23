import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock server-only before importing server actions
vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  },
}));

// vi.hoisted ensures mockRateLimit is available when the vi.mock factory runs
const mockRateLimit = vi.hoisted(() =>
  vi.fn().mockReturnValue({ success: true, remaining: 4, reset: Date.now() + 60000 })
);

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mockRateLimit,
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}));

// vi.hoisted ensures mockSupabaseAuth is available inside the vi.mock factory below
const mockSupabaseAuth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: mockSupabaseAuth,
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

import { signIn, signUp, forgotPassword } from '@/lib/auth/actions';

describe('auth/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ success: true, remaining: 4, reset: Date.now() + 60000 });
  });

  describe('signIn', () => {
    it('returns error on Supabase sign-in failure', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      const fd = new FormData();
      fd.append('email', 'user@example.com');
      fd.append('password', 'validpassword123');
      fd.append('locale', 'en');

      const result = await signIn(fd);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
    });

    it('returns validation error for invalid email', async () => {
      const fd = new FormData();
      fd.append('email', 'not-an-email');
      fd.append('password', 'pass');
      fd.append('locale', 'en');

      const result = await signIn(fd);
      expect(result.success).toBe(false);
    });

    it('returns rate limit error when requests are exhausted', async () => {
      mockRateLimit.mockReturnValueOnce({ success: false, remaining: 0, reset: Date.now() + 60000 });

      const fd = new FormData();
      fd.append('email', 'user@example.com');
      fd.append('password', 'password123');
      fd.append('locale', 'en');

      const result = await signIn(fd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many');
    });
  });

  describe('forgotPassword', () => {
    it('returns success when Supabase responds without error', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const fd = new FormData();
      fd.append('email', 'user@example.com');
      fd.append('locale', 'en');

      const result = await forgotPassword(fd);
      expect(result.success).toBe(true);
    });

    it('returns error when Supabase resetPassword fails', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Email not found' },
      });

      const fd = new FormData();
      fd.append('email', 'user@example.com');
      fd.append('locale', 'en');

      const result = await forgotPassword(fd);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not found');
    });

    it('returns validation error for missing email', async () => {
      const fd = new FormData();
      fd.append('locale', 'en');

      const result = await forgotPassword(fd);
      expect(result.success).toBe(false);
    });
  });

  describe('signUp', () => {
    it('returns validation error for short password', async () => {
      const fd = new FormData();
      fd.append('email', 'user@example.com');
      fd.append('password', '123'); // too short
      fd.append('fullName', 'Test User');
      fd.append('locale', 'en');

      const result = await signUp(fd);
      expect(result.success).toBe(false);
    });
  });
});
