/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const { createElement } = await import('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tag = (el: string) => ({ children, ...rest }: Record<string, any>) =>
    createElement(el, rest, children);
  return {
    motion: { div: tag('div'), p: tag('p'), span: tag('span'), button: tag('button'), h2: tag('h2'), li: tag('li'), section: tag('section') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => createElement(React.Fragment, {}, children),
  };
});

// Chainable supabase mock — every method returns the same chain ending in { data, error }
vi.mock('@/lib/supabase/client', () => {
  const result = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete', 'upsert', 'range', 'filter', 'match', 'in', 'is', 'or', 'not', 'contains', 'containedBy', 'textSearch', 'ilike', 'like']) {
    chain[m] = vi.fn(() => ({ ...chain, ...result }));
  }
  return {
    createClient: () => ({
      from: () => ({ ...chain, ...result }),
      rpc: () => result,
    }),
  };
});

// Mock lucide icons
vi.mock('lucide-react', () => {
  const icon = () => React.createElement('span');
  return {
    TrendingUp: icon,
    Users: icon,
    Package: icon,
    DollarSign: icon,
    ShoppingCart: icon,
    Clock: icon,
    ArrowUp: icon,
    ArrowDown: icon,
    Eye: icon,
    Search: icon,
    AlertTriangle: icon,
    Plus: icon,
    Minus: icon,
    Save: icon,
    RefreshCw: icon,
    ArrowUpDown: icon,
  };
});

import AdminDashboard from '@/components/admin/AdminDashboard';
import InventoryManager from '@/components/admin/InventoryManager';

describe('AdminDashboard', () => {
  it('renders dashboard title in English', async () => {
    render(<AdminDashboard locale="en" />);
    await waitFor(() => expect(screen.getByText('Admin Dashboard')).toBeInTheDocument());
  });

  it('renders dashboard title in Turkish', async () => {
    render(<AdminDashboard locale="tr" />);
    await waitFor(() => expect(screen.getByText('Yönetim Paneli')).toBeInTheDocument());
  });

  it('renders time range buttons', async () => {
    render(<AdminDashboard locale="en" />);
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
  });
});

describe('InventoryManager', () => {
  it('renders title in English', async () => {
    render(<InventoryManager locale="en" />);
    await waitFor(() => expect(screen.getByText('Inventory Management')).toBeInTheDocument());
  });

  it('renders title in Turkish', async () => {
    render(<InventoryManager locale="tr" />);
    await waitFor(() => expect(screen.getByText('Stok Yönetimi')).toBeInTheDocument());
  });

  it('renders search input', async () => {
    render(<InventoryManager locale="en" />);
    await waitFor(() => expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument());
  });

  it('renders category filter dropdown', async () => {
    render(<InventoryManager locale="en" />);
    await waitFor(() => expect(screen.getByText('All Categories')).toBeInTheDocument());
  });
});
