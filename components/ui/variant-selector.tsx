'use client';

import { useState } from 'react';
import type { ProductVariant } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface VariantSelectorProps {
  variants: ProductVariant[];
  locale: 'tr' | 'en';
  basePrice: number;
  onSelect?: (variant: ProductVariant | null) => void;
  /** Initial selected variant ID */
  defaultVariantId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(price: number, locale: string = 'tr') {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(price);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * VariantSelector
 *
 * Renders a button-group UI for picking a product variant (size / flavor).
 * Out-of-stock variants are shown as disabled with a strikethrough label.
 *
 * Usage:
 * ```tsx
 * <VariantSelector
 *   variants={variants}
 *   locale={locale}
 *   basePrice={product.price}
 *   onSelect={(v) => setSelectedVariant(v)}
 * />
 * ```
 */
export function VariantSelector({
  variants,
  locale,
  basePrice,
  onSelect,
  defaultVariantId,
}: VariantSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultVariantId ?? (variants.length > 0 ? variants[0].id : null),
  );

  if (variants.length === 0) return null;

  function handleSelect(variant: ProductVariant) {
    if (variant.stock === 0) return;
    setSelectedId(variant.id);
    onSelect?.(variant);
  }

  // Group by dimension: prefer 'size', fallback to 'flavor', fallback to 'name'
  const groupLabel =
    locale === 'tr'
      ? variants.some((v) => v.size) ? 'Boyut seçin' : 'Seçenek'
      : variants.some((v) => v.size) ? 'Choose size' : 'Option';

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-700">
        {groupLabel}
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label={groupLabel}>
        {variants.map((variant) => {
          const isSelected = selectedId === variant.id;
          const isOutOfStock = variant.stock === 0;
          const label = locale === 'tr' ? variant.name_tr : variant.name_en;
          const finalPrice = basePrice + variant.price_offset;

          return (
            <button
              key={variant.id}
              type="button"
              aria-pressed={isSelected}
              aria-disabled={isOutOfStock}
              disabled={isOutOfStock}
              onClick={() => handleSelect(variant)}
              className={[
                'relative px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                isSelected
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-amber-300',
                isOutOfStock
                  ? 'opacity-40 cursor-not-allowed line-through'
                  : 'cursor-pointer',
              ].join(' ')}
            >
              <span className="block">{label}</span>
              {variant.price_offset !== 0 && (
                <span className="block text-xs text-neutral-500">
                  {formatPrice(finalPrice, locale)}
                  {variant.price_offset > 0 ? ' (+)' : ' (-)'}
                </span>
              )}
              {isOutOfStock && (
                <span className="sr-only">
                  {locale === 'tr' ? 'Stokta yok' : 'Out of stock'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
