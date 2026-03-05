/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement('img', { ...props, fill: undefined }),
}));

vi.mock('lucide-react', () => ({
  Minus: () => React.createElement('span', {}, '−'),
  Plus: () => React.createElement('span', {}, '+'),
  Trash2: () => React.createElement('span', {}, '🗑'),
}));

import { CartItemRow } from '@/components/ui/cart-item-row';
import type { CartItem } from '@/lib/types';

const mockItem: CartItem = {
  product: {
    id: 'p1',
    slug: 'glazed-donut',
    name_tr: 'Sade Donut',
    name_en: 'Glazed Donut',
    description_tr: 'Klasik donut',
    description_en: 'Classic donut',
    price: 25,
    image_url: '/donut.png',
    category: 'glazed',
    stock: 10,
    featured: false,
    created_at: '2026-01-01T00:00:00Z',
  },
  quantity: 3,
};

describe('CartItemRow', () => {
  const onUpdateQuantity = vi.fn();
  const onRemove = vi.fn();

  it('renders product name and price', () => {
    render(
      <CartItemRow
        item={mockItem}
        removeLabel="Remove"
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    );
    expect(screen.getByText('Glazed Donut')).toBeInTheDocument();
  });

  it('renders quantity input with correct value', () => {
    render(
      <CartItemRow
        item={mockItem}
        removeLabel="Remove"
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    );
    const input = screen.getByRole('spinbutton', { name: /quantity of glazed donut/i });
    expect(input).toHaveValue(3);
  });

  it('calls onUpdateQuantity when decrease button is clicked', () => {
    onUpdateQuantity.mockClear();
    render(
      <CartItemRow
        item={mockItem}
        removeLabel="Remove"
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    );
    const decreaseBtn = screen.getByRole('button', { name: /decrease quantity/i });
    fireEvent.click(decreaseBtn);
    expect(onUpdateQuantity).toHaveBeenCalledWith('p1', 2);
  });

  it('calls onUpdateQuantity when increase button is clicked', () => {
    onUpdateQuantity.mockClear();
    render(
      <CartItemRow
        item={mockItem}
        removeLabel="Remove"
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    );
    const increaseBtn = screen.getByRole('button', { name: /increase quantity/i });
    fireEvent.click(increaseBtn);
    expect(onUpdateQuantity).toHaveBeenCalledWith('p1', 4);
  });

  it('calls onRemove when remove button is clicked', () => {
    onRemove.mockClear();
    render(
      <CartItemRow
        item={mockItem}
        removeLabel="Remove"
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
      />
    );
    const removeBtn = screen.getByRole('button', { name: /remove glazed donut/i });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith('p1');
  });
});
