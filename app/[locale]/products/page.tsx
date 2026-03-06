'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw } from 'lucide-react';
import { sampleProducts } from '@/lib/data';
import { useDebounce } from '@/hooks';
import { SEARCH_DEBOUNCE_MS, PRODUCT_CATEGORIES } from '@/lib/constants';
import { ProductCard } from '@/components/ui/product-card';
import { SectionSuspense } from '@/components/ui/section-suspense';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json() as { products: Product[] };
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
        }
      }
    } catch {
      // fallback to sampleProducts (already set as default)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter((product) => {
    const q = debouncedSearch.toLowerCase();
    const matchesSearch =
      product.name_en.toLowerCase().includes(q) ||
      product.name_tr.toLowerCase().includes(q);
    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-fredoka text-5xl font-bold mb-4 bg-gradient-donut bg-clip-text text-transparent">
          {t('products.title')}
        </h1>
        <p className="text-gray-700 text-lg">
          {t('products.subtitle')}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t('products.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {PRODUCT_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {t(`products.categories.${category}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <SectionSuspense name="ProductGrid">
      <h2 className="sr-only">{t('products.title')} listing</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            locale={locale}
            categoryLabel={t(`products.categories.${product.category}`)}
            addToCartLabel={t('products.addToCart')}
            outOfStockLabel={t('products.outOfStock')}
            priority={index === 0}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-700 text-lg">{t('products.noProducts')} {t('products.tryDifferentSearch')}</p>
        </div>
      )}
      </SectionSuspense>
    </div>
  );
}
