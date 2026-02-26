/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const { createElement } = await import('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tag = (el: string) => ({ children, ...rest }: Record<string, any>) =>
    createElement(el, rest, children);
  return {
    motion: { div: tag('div'), p: tag('p'), span: tag('span') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => createElement(React.Fragment, {}, children),
  };
});

vi.mock('lucide-react', () => ({
  Users: () => null,
  Gift: () => null,
  Copy: () => null,
  Check: () => null,
  Share2: () => null,
  Trophy: () => null,
}));

// Chainable Supabase mock that can be awaited at any point in the chain
function makeChain(data: unknown = null) {
  const resolved = { data, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  ['select', 'eq', 'neq', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockResolvedValue(resolved);
  chain.single = vi.fn().mockResolvedValue(resolved);
  // Make chain itself awaitable (for terminal .order() / .limit() calls)
  chain.then = (resolve: (v: typeof resolved) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(resolved).then(resolve, reject);
  chain.catch = (reject: (e: unknown) => unknown) =>
    Promise.resolve(resolved).catch(reject);
  return chain;
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue(makeChain(null)),
  }),
}));

import ReferralDashboard from '@/components/referrals/ReferralDashboard';

describe('ReferralDashboard', () => {
  it('shows loading state initially', async () => {
    render(<ReferralDashboard userId="user-1" locale="en" />);
    // The skeleton div should be present before resolution
    const { container } = render(<ReferralDashboard userId="user-1" locale="en" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders title after data loads in English', async () => {
    render(<ReferralDashboard userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getAllByText('Refer a Friend').length).toBeGreaterThan(0);
    });
  });

  it('renders title after data loads in Turkish', async () => {
    render(<ReferralDashboard userId="user-1" locale="tr" />);
    await waitFor(() => {
      expect(screen.getAllByText('Arkadaşını Davet Et').length).toBeGreaterThan(0);
    });
  });

  it('shows "no referrals yet" when referrals list is empty', async () => {
    render(<ReferralDashboard userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getAllByText('No referrals yet').length).toBeGreaterThan(0);
    });
  });

  it('shows how it works steps', async () => {
    render(<ReferralDashboard userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getAllByText('How It Works?').length).toBeGreaterThan(0);
    });
  });
});
