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
  Crown: () => null,
  Star: () => null,
  Gift: () => null,
  TrendingUp: () => null,
  History: () => null,
}));

function makeChain(data: unknown = null) {
  const resolved = { data, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  ['select', 'eq', 'neq', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockResolvedValue(resolved);
  chain.single = vi.fn().mockResolvedValue(resolved);
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

import LoyaltyDashboard from '@/components/loyalty/LoyaltyDashboard';

describe('LoyaltyDashboard', () => {
  it('shows loading skeleton initially', () => {
    const { container } = render(<LoyaltyDashboard userId="user-1" locale="en" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Loyalty Program title after loading (English)', async () => {
    render(<LoyaltyDashboard userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('Loyalty Program')).toBeInTheDocument();
    });
  });

  it('renders Sadakat Programı title in Turkish', async () => {
    render(<LoyaltyDashboard userId="user-1" locale="tr" />);
    await waitFor(() => {
      expect(screen.getByText('Sadakat Programı')).toBeInTheDocument();
    });
  });

  it('shows bronze tier when no loyalty data', async () => {
    render(<LoyaltyDashboard userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('bronze')).toBeInTheDocument();
    });
  });

  it('shows "No transactions yet" when transactions empty', async () => {
    render(<LoyaltyDashboard userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    });
  });

  it('shows earn rate info', async () => {
    render(<LoyaltyDashboard userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('Every ₺10 = 1 Point')).toBeInTheDocument();
    });
  });
});
