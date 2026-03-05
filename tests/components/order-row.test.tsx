/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement('img', { ...props, fill: undefined }),
}));

vi.mock('lucide-react', () => ({
  Package: () => React.createElement('span', { 'data-testid': 'package-icon' }),
  CreditCard: () => React.createElement('span', {}),
  ChefHat: () => React.createElement('span', {}),
  Truck: () => React.createElement('span', {}),
  CheckCircle2: () => React.createElement('span', {}),
  XCircle: () => React.createElement('span', {}),
  Clock: () => React.createElement('span', {}),
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('a', props, children as React.ReactNode),
}));

import { OrderRow } from '@/components/ui/order-row';

const mockOrder = {
  id: 'abc12345-6789-0000-0000-000000000000',
  status: 'paid',
  total_amount: 7500,
  shipping_address: 'Kadıköy, Istanbul',
  created_at: '2026-03-01T12:00:00Z',
  order_items: [
    { id: 'i1', product_name: 'Glazed Donut', quantity: 2, unit_price: 2500 },
    { id: 'i2', product_name: 'Chocolate Donut', quantity: 1, unit_price: 2500 },
  ],
};

describe('OrderRow', () => {
  it('renders order number (first 8 chars uppercased)', () => {
    render(
      <OrderRow
        order={mockOrder}
        orderNumberLabel="Order #"
        totalLabel="Total"
        trackLabel="Track"
      />
    );
    expect(screen.getByText('ABC12345')).toBeInTheDocument();
  });

  it('renders order items', () => {
    render(
      <OrderRow
        order={mockOrder}
        orderNumberLabel="Order #"
        totalLabel="Total"
        trackLabel="Track"
      />
    );
    expect(screen.getByText(/Glazed Donut × 2/)).toBeInTheDocument();
    expect(screen.getByText(/Chocolate Donut × 1/)).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(
      <OrderRow
        order={mockOrder}
        orderNumberLabel="Order #"
        totalLabel="Total"
        trackLabel="Track"
      />
    );
    expect(screen.getByText('Ödendi')).toBeInTheDocument();
  });

  it('renders pending status', () => {
    render(
      <OrderRow
        order={{ ...mockOrder, status: 'pending' }}
        orderNumberLabel="Order #"
        totalLabel="Total"
        trackLabel="Track"
      />
    );
    expect(screen.getByText('Beklemede')).toBeInTheDocument();
  });

  it('renders order items list with proper role', () => {
    render(
      <OrderRow
        order={mockOrder}
        orderNumberLabel="Order #"
        totalLabel="Total"
        trackLabel="Track"
      />
    );
    expect(screen.getByRole('list', { name: /order items/i })).toBeInTheDocument();
  });
});
