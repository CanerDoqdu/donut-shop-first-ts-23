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
  Package: () => null,
  Calendar: () => null,
  Pause: () => null,
  Play: () => null,
  Settings: () => null,
  Truck: () => null,
}));

function makeChain(data: unknown = null) {
  const resolved = { data, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  ['select', 'eq', 'neq', 'order', 'limit', 'update'].forEach((m) => {
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

import SubscriptionManager from '@/components/subscriptions/SubscriptionManager';

describe('SubscriptionManager', () => {
  it('shows loading skeleton initially', () => {
    const { container } = render(<SubscriptionManager userId="user-1" locale="en" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows no-subscription state after loading (English)', async () => {
    render(<SubscriptionManager userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getByText("You don't have a subscription yet")).toBeInTheDocument();
    });
  });

  it('shows Subscribe Now button when no subscription', async () => {
    render(<SubscriptionManager userId="user-1" locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('Subscribe Now')).toBeInTheDocument();
    });
  });

  it('shows no-subscription state in Turkish', async () => {
    render(<SubscriptionManager userId="user-1" locale="tr" />);
    await waitFor(() => {
      expect(screen.getByText('Henüz aboneliğiniz yok')).toBeInTheDocument();
    });
  });
});
