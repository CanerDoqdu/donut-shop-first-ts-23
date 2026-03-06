'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { AddToCartButton } from '@/components/ui/add-to-cart-button';
import type { Product } from '@/lib/types';

const FALLBACK_IMG = '/donut-empty.png';

/** Encode spaces & parens in image paths so Next.js Image handles them correctly */
function safeSrc(url: string): string {
  // Already a data-uri or absolute URL → leave as-is
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return encodeURI(decodeURI(url)); // idempotent encode
}

function ProductImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(() => safeSrc(src));
  const [errored, setErrored] = useState(false);

  return (
    <div className="w-full aspect-square relative mb-4 group-hover:scale-110 transition-transform">
      {!loaded && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div
            className="w-full h-full bg-linear-to-r from-pink-100 via-white to-pink-100 animate-[shimmer_1.5s_infinite]"
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite linear',
            }}
          />
        </div>
      )}
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes="(min-width: 1536px) 240px, (min-width: 1280px) 220px, (min-width: 1024px) 22vw, (min-width: 640px) 40vw, 88vw"
        quality={60}
        priority={priority}
        loading={priority ? 'eager' : undefined}
        className={`object-contain drop-shadow-lg transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!errored) {
            setImgSrc(FALLBACK_IMG);
            setErrored(true);
          }
          setLoaded(true);
        }}
      />
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  locale: string;
  categoryLabel: string;
  addToCartLabel: string;
  outOfStockLabel: string;
  priority?: boolean;
}

/**
 * Memoised product card — only re-renders when its own props change.
 * Extracted from products page for performance (avoids re-rendering all cards
 * when search query or category filter changes).
 */
export const ProductCard = memo(function ProductCard({
  product,
  locale,
  categoryLabel,
  addToCartLabel,
  outOfStockLabel,
  priority = false,
}: ProductCardProps) {
  const name = locale === 'tr' ? product.name_tr : product.name_en;
  const description = locale === 'tr' ? product.description_tr : product.description_en;

  return (
    <Card className="group hover:scale-105 transition-transform">
      <Link href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}>
        <CardContent className="pt-6 cursor-pointer">
          <ProductImage key={product.image_url} src={product.image_url} alt={name} priority={priority} />
          <CardTitle className="text-center mb-2 text-lg">
            {name}
          </CardTitle>
          <p className="text-center text-sm text-gray-700 mb-3 line-clamp-2">
            {description}
          </p>
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary">{categoryLabel}</Badge>
            <span className="text-sm text-gray-700">Stock: {product.stock}</span>
          </div>
          <p className="text-center font-fredoka text-2xl font-bold text-[#FF6BBF]">
            {formatPrice(product.price)}
          </p>
        </CardContent>
      </Link>
      <CardFooter>
        <AddToCartButton
          product={product}
          label={addToCartLabel}
          outOfStockLabel={outOfStockLabel}
        />
      </CardFooter>
    </Card>
  );
});
