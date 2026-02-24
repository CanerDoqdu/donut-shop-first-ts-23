/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VariantSelector } from '@/components/ui/variant-selector';
import type { ProductVariant } from '@/lib/types';

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  const hasSize = Object.prototype.hasOwnProperty.call(overrides, 'size');

  return {
    id: overrides.id ?? 'v1',
    product_id: overrides.product_id ?? 'p1',
    name_tr: overrides.name_tr ?? 'Büyük',
    name_en: overrides.name_en ?? 'Large',
    size: hasSize ? (overrides.size as string | null) : 'L',
    flavor: overrides.flavor ?? null,
    sku: overrides.sku ?? null,
    price_offset: overrides.price_offset ?? 0,
    stock: overrides.stock ?? 10,
    active: overrides.active ?? true,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
  };
}

describe('VariantSelector', () => {
  it('shows "Choose size" for EN when variants include size', () => {
    render(
      <VariantSelector
        variants={[makeVariant({ id: 'v1', size: 'L' })]}
        locale="en"
        basePrice={100}
      />,
    );

    expect(screen.getByText('Choose size')).toBeInTheDocument();
  });

  it('shows "Boyut seçin" for TR when variants include size', () => {
    render(
      <VariantSelector
        variants={[makeVariant({ id: 'v1-tr', size: 'M' })]}
        locale="tr"
        basePrice={100}
      />,
    );

    expect(screen.getByText('Boyut seçin')).toBeInTheDocument();
  });

  it('shows "Seçenek" for TR when variants do not include size', () => {
    render(
      <VariantSelector
        variants={[makeVariant({ id: 'v2', size: null, flavor: 'vanilla' })]}
        locale="tr"
        basePrice={100}
      />,
    );

    expect(screen.getByText('Seçenek')).toBeInTheDocument();
  });

  it('shows "Option" for EN when variants do not include size', () => {
    render(
      <VariantSelector
        variants={[makeVariant({ id: 'v3-en', size: null, flavor: 'hazelnut' })]}
        locale="en"
        basePrice={100}
      />,
    );

    expect(screen.getByText('Option')).toBeInTheDocument();
  });

  it('prevents selecting out-of-stock variants', () => {
    const onSelect = vi.fn();

    render(
      <VariantSelector
        variants={[
          makeVariant({ id: 'in-stock', name_en: 'In Stock', stock: 2 }),
          makeVariant({ id: 'out-stock', name_en: 'Out Stock', stock: 0 }),
        ]}
        locale="en"
        basePrice={100}
        onSelect={onSelect}
      />,
    );

    const outStockButton = screen.getByRole('button', { name: /Out Stock/i });
    expect(outStockButton).toBeDisabled();

    fireEvent.click(outStockButton);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onSelect when clicking an in-stock variant', () => {
    const onSelect = vi.fn();

    render(
      <VariantSelector
        variants={[
          makeVariant({ id: 'v-a', name_en: 'Small', size: 'S' }),
          makeVariant({ id: 'v-b', name_en: 'Medium', size: 'M' }),
        ]}
        locale="en"
        basePrice={50}
        onSelect={onSelect}
      />,
    );

    // Click the second variant (not pre-selected)
    fireEvent.click(screen.getByRole('button', { name: /Medium/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'v-b' }),
    );
  });

  it('renders price offset with formatPrice when offset is non-zero', () => {
    render(
      <VariantSelector
        variants={[
          makeVariant({ id: 'v-plus', name_en: 'XL', price_offset: 25, size: 'XL' }),
          makeVariant({ id: 'v-minus', name_en: 'Mini', price_offset: -10, size: 'XS' }),
        ]}
        locale="en"
        basePrice={100}
      />,
    );

    // Positive offset shows (+)
    expect(screen.getByText(/\(\+\)/)).toBeInTheDocument();
    // Negative offset shows (-)
    expect(screen.getByText(/\(\-\)/)).toBeInTheDocument();
  });

  it('returns null when variants array is empty', () => {
    const { container } = render(
      <VariantSelector variants={[]} locale="en" basePrice={100} />,
    );

    expect(container.innerHTML).toBe('');
  });
});
