'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { AddToCartButton } from '@/components/ui/add-to-cart-button';
import type { Product } from '@/lib/types';

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

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
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className={`object-contain drop-shadow-lg transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  categoryLabel: string;
  addToCartLabel: string;
  outOfStockLabel: string;
}

/**
 * Memoised product card — only re-renders when its own props change.
 * Extracted from products page for performance (avoids re-rendering all cards
 * when search query or category filter changes).
 */
export const ProductCard = memo(function ProductCard({
  product,
  categoryLabel,
  addToCartLabel,
  outOfStockLabel,
}: ProductCardProps) {
  return (
    <Card className="group hover:scale-105 transition-transform">
      <Link href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}>
        <CardContent className="pt-6 cursor-pointer">
          <ProductImage src={product.image_url} alt={product.name_en} />
          <CardTitle className="text-center mb-2 text-lg">
            {product.name_en}
          </CardTitle>
          <p className="text-center text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description_en}
          </p>
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary">{categoryLabel}</Badge>
            <span className="text-sm text-gray-500">Stock: {product.stock}</span>
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
