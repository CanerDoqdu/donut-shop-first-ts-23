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

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('a', props, children as React.ReactNode),
}));

vi.mock('@/components/ui/add-to-cart-button', () => ({
  AddToCartButton: ({ label, outOfStockLabel, product }: Record<string, unknown>) =>
    React.createElement(
      'button',
      { 'data-testid': 'add-to-cart' },
      (product as { stock: number }).stock === 0 ? outOfStockLabel as string : label as string
    ),
}));

import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/lib/types';

const baseProduct: Product = {
  id: 'p1',
  slug: 'glazed-donut',
  name_tr: 'Sade Donut',
  name_en: 'Glazed Donut',
  description_tr: 'Klasik sade donut',
  description_en: 'Classic glazed donut',
  price: 25,
  image_url: '/donut.png',
  category: 'glazed',
  stock: 10,
  featured: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('ProductCard', () => {
  it('renders product name in English', () => {
    render(
      <ProductCard
        product={baseProduct}
        locale="en"
        categoryLabel="Glazed"
        addToCartLabel="Add to Cart"
        outOfStockLabel="Out of Stock"
      />
    );
    expect(screen.getByText('Glazed Donut')).toBeInTheDocument();
  });

  it('renders product name in Turkish', () => {
    render(
      <ProductCard
        product={baseProduct}
        locale="tr"
        categoryLabel="Klasik"
        addToCartLabel="Sepete Ekle"
        outOfStockLabel="Tükendi"
      />
    );
    expect(screen.getByText('Sade Donut')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(
      <ProductCard
        product={baseProduct}
        locale="en"
        categoryLabel="Glazed"
        addToCartLabel="Add to Cart"
        outOfStockLabel="Out of Stock"
      />
    );
    expect(screen.getByText('Glazed')).toBeInTheDocument();
  });

  it('renders add to cart button', () => {
    render(
      <ProductCard
        product={baseProduct}
        locale="en"
        categoryLabel="Glazed"
        addToCartLabel="Add to Cart"
        outOfStockLabel="Out of Stock"
      />
    );
    expect(screen.getByTestId('add-to-cart')).toHaveTextContent('Add to Cart');
  });

  it('shows out of stock when stock is 0', () => {
    render(
      <ProductCard
        product={{ ...baseProduct, stock: 0 }}
        locale="en"
        categoryLabel="Glazed"
        addToCartLabel="Add to Cart"
        outOfStockLabel="Out of Stock"
      />
    );
    expect(screen.getByTestId('add-to-cart')).toHaveTextContent('Out of Stock');
  });

  it('renders product image', () => {
    render(
      <ProductCard
        product={baseProduct}
        locale="en"
        categoryLabel="Glazed"
        addToCartLabel="Add to Cart"
        outOfStockLabel="Out of Stock"
      />
    );
    expect(screen.getByAltText('Glazed Donut')).toBeInTheDocument();
  });
});
