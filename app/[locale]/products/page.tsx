'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { Search, ShoppingCart } from 'lucide-react';
import { sampleProducts } from '@/lib/data';
import { Link } from '@/i18n/routing';

export default function ProductsPage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const addItem = useCartStore((state) => state.addItem);

  const categories = ['all', 'glazed', 'filled', 'specialty', 'seasonal', 'beverage'];

  const filteredProducts = sampleProducts.filter((product) => {
    const matchesSearch =
      product.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name_tr.toLowerCase().includes(searchQuery.toLowerCase());
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
        <p className="text-gray-600 text-lg">
          Discover our delicious selection of handcrafted donuts
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
          {categories.map((category) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="group hover:scale-105 transition-transform">
            <Link href={{ pathname: '/products/[slug]', params: { slug: product.slug } }}>
              <CardContent className="pt-6 cursor-pointer">
                <div className="w-full aspect-square relative mb-4 group-hover:scale-110 transition-transform">
                  <Image
                    src={product.image_url}
                    alt={product.name_en}
                    fill
                    className="object-contain drop-shadow-lg"
                  />
                </div>
                <CardTitle className="text-center mb-2 text-lg">
                  {product.name_en}
                </CardTitle>
                <p className="text-center text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description_en}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{t(`products.categories.${product.category}`)}</Badge>
                  <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                </div>
                <p className="text-center font-fredoka text-2xl font-bold text-[#FF6BBF]">
                  {formatPrice(product.price)}
                </p>
              </CardContent>
            </Link>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => addItem(product)}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {product.stock > 0 ? t('products.addToCart') : t('products.outOfStock')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No products found. Try a different search!</p>
        </div>
      )}
    </div>
  );
}
