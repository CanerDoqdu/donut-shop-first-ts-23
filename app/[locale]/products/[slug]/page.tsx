'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { sampleProducts } from '@/lib/data';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Minus, Plus, ShoppingCart, Star, Truck, Clock, Shield } from 'lucide-react';

export default function ProductDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const slug = params.slug as string;
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const product = sampleProducts.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4">🍩</div>
          <h1 className="text-2xl font-fredoka font-bold mb-2">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The donut you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/products">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedProducts = sampleProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-pink-500 transition-colors">
            {t('nav.home')}
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-pink-500 transition-colors">
            {t('nav.products')}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{product.name_en}</span>
        </nav>

        {/* Product Detail */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Product Image */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-80 h-80 rounded-full bg-linear-to-br from-pink-100 to-orange-100 flex items-center justify-center shadow-2xl overflow-hidden">
                <Image
                  src={product.image_url}
                  alt={product.name_en}
                  width={280}
                  height={280}
                  className="object-contain drop-shadow-xl"
                />
              </div>
              {product.featured && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-linear-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 text-sm">
                    <Star className="w-3 h-3 mr-1 inline" />
                    {t('products.featured')}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="w-fit mb-3">
              {t(`products.categories.${product.category}`)}
            </Badge>

            <h1 className="text-4xl font-fredoka font-bold text-gray-900 mb-3">
              {product.name_en}
            </h1>

            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              {product.description_en}
            </p>

            <div className="text-4xl font-fredoka font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-orange-500 mb-6">
              {formatPrice(product.price)}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock > 0 ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-600 font-medium">
                    {t('products.inStock')} ({product.stock} {t('products.left')})
                  </span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-red-600 font-medium">{t('products.outOfStock')}</span>
                </>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-gray-700 font-medium">{t('products.quantity')}:</span>
              <div className="flex items-center gap-3 bg-white rounded-full shadow px-4 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-gray-500 hover:text-pink-500 transition-colors"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="font-fredoka text-xl font-bold w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="text-gray-500 hover:text-pink-500 transition-colors"
                  disabled={quantity >= product.stock}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              className="w-full md:w-auto text-lg py-6"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {added ? (
                <>{t('products.addedToCart')} ✓</>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {t('products.addToCart')} — {formatPrice(product.price * quantity)}
                </>
              )}
            </Button>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-col items-center text-center gap-1">
                <Truck className="w-6 h-6 text-pink-500" />
                <span className="text-xs text-gray-600">{t('products.freeDelivery')}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Clock className="w-6 h-6 text-orange-500" />
                <span className="text-xs text-gray-600">{t('products.freshDaily')}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Shield className="w-6 h-6 text-yellow-500" />
                <span className="text-xs text-gray-600">{t('products.qualityGuarantee')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-fredoka font-bold text-gray-900 mb-6">
              {t('products.relatedProducts')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((rp) => (
                <Link key={rp.id} href={{ pathname: '/products/[slug]', params: { slug: rp.slug } }}>
                  <Card className="group hover:scale-105 transition-transform cursor-pointer">
                    <CardContent className="pt-4 pb-4">
                      <div className="w-full aspect-square relative mb-2 group-hover:scale-110 transition-transform">
                        <Image
                          src={rp.image_url}
                          alt={rp.name_en}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <h3 className="text-sm font-semibold text-center mb-1 truncate">
                        {rp.name_en}
                      </h3>
                      <p className="text-center font-fredoka font-bold text-pink-500">
                        {formatPrice(rp.price)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
