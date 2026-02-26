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
  MapPin: () => null,
  Navigation: () => null,
  Phone: () => null,
  Clock: () => null,
  Search: () => null,
  List: () => null,
  Map: () => null,
}));

// Mock dynamic import (StoreMap uses dynamic to avoid SSR)
vi.mock('next/dynamic', () => ({
  default: () => () => React.createElement('div', { 'data-testid': 'store-map' }),
}));

vi.mock('@/components/ui/skeleton', () => ({
  StoreGridSkeleton: () => React.createElement('div', { 'data-testid': 'skeleton' }),
}));

function makeChain(data: unknown = null, error: unknown = new Error('db unavailable')) {
  const resolved = { data, error };
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

import StoreFinder from '@/components/stores/StoreFinder';

describe('StoreFinder', () => {
  it('renders title after loading in English', async () => {
    render(<StoreFinder locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('Store Finder')).toBeInTheDocument();
    });
  });

  it('renders title after loading in Turkish', async () => {
    render(<StoreFinder locale="tr" />);
    await waitFor(() => {
      expect(screen.getByText('Mağaza Bulucu')).toBeInTheDocument();
    });
  });

  it('renders list and map view toggle buttons', async () => {
    render(<StoreFinder locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('List')).toBeInTheDocument();
      expect(screen.getByText('Map')).toBeInTheDocument();
    });
  });

  it('renders Use My Location button', async () => {
    render(<StoreFinder locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('Use My Location')).toBeInTheDocument();
    });
  });
});
