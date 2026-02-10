'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { sampleProducts } from '@/lib/data';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  X,
  Check,
  Star,
} from 'lucide-react';

type Product = (typeof sampleProducts)[number];

export default function AdminProductsPage() {
  const t = useTranslations();
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New product form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'glazed',
    featured: false,
  });

  const filteredProducts = products.filter((p) =>
    p.name_en.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleToggleFeatured = (id: string) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p))
    );
  };

  const handleStockUpdate = (id: string, newStock: number) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
    );
    setEditingId(null);
  };

  const stats = {
    total: products.length,
    featured: products.filter((p) => p.featured).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-fredoka font-bold text-gray-900">
              {t('admin.products.title')}
            </h1>
            <p className="text-gray-500 mt-1">Manage your donut inventory</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? (
              <>
                <X className="w-4 h-4 mr-2" />
                {t('common.cancel')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.products.add')}
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.featured}</p>
                  <p className="text-xs text-gray-500">Featured</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{stats.outOfStock}</p>
                  <p className="text-xs text-gray-500">Out of Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <span className="text-green-500 font-bold text-sm">₺</span>
                </div>
                <div>
                  <p className="text-2xl font-fredoka font-bold">{formatPrice(stats.totalValue)}</p>
                  <p className="text-xs text-gray-500">Inventory Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Product Form */}
        {showAddForm && (
          <Card className="mb-8 border-2 border-dashed border-pink-300">
            <CardContent className="pt-6">
              <h3 className="font-fredoka font-bold text-lg mb-4">{t('admin.products.add')}</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('admin.products.name')}
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Donut name..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('admin.products.price')} (₺)
                  </label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('admin.products.stock')}
                  </label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {t('admin.products.category')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-pink-400 focus:outline-none"
                  >
                    <option value="glazed">Glazed</option>
                    <option value="filled">Filled</option>
                    <option value="specialty">Specialty</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="beverage">Beverage</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{t('admin.products.featured')}</span>
                </label>
                <Button
                  onClick={() => {
                    if (formData.name && formData.price) {
                      const newProduct: Product = {
                        id: `new-${Date.now()}`,
                        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
                        name_tr: formData.name,
                        name_en: formData.name,
                        description_tr: '',
                        description_en: '',
                        price: parseFloat(formData.price),
                        image_url: '/cf29a9f29438e2dcd9091ebdf9385eb1.png',
                        category: formData.category as Product['category'],
                        stock: parseInt(formData.stock) || 0,
                        featured: formData.featured,
                        created_at: new Date().toISOString(),
                      };
                      setProducts([newProduct, ...products]);
                      setFormData({ name: '', price: '', stock: '', category: 'glazed', featured: false });
                      setShowAddForm(false);
                    }
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            className="pl-12"
            placeholder={t('products.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Products Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-linear-to-r from-pink-500 to-orange-500 text-white">
                  <th className="px-6 py-3 text-left text-sm font-medium">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">{t('admin.products.category')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">{t('admin.products.price')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">{t('admin.products.stock')}</th>
                  <th className="px-6 py-3 text-center text-sm font-medium">{t('admin.products.featured')}</th>
                  <th className="px-6 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-pink-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative shrink-0">
                          <Image
                            src={product.image_url}
                            alt={product.name_en}
                            fill
                            className="object-contain rounded-lg"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name_en}</p>
                          <p className="text-xs text-gray-500 truncate max-w-50">
                            {product.description_en}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary">
                        {t(`products.categories.${product.category}`)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-fredoka font-bold text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === product.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            defaultValue={product.stock}
                            className="w-20 h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleStockUpdate(
                                  product.id,
                                  parseInt((e.target as HTMLInputElement).value) || 0
                                );
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingId(product.id)}
                          className={`font-medium ${
                            product.stock === 0
                              ? 'text-red-500'
                              : product.stock < 10
                              ? 'text-yellow-500'
                              : 'text-green-500'
                          } hover:underline cursor-pointer`}
                        >
                          {product.stock}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleFeatured(product.id)}
                        className="cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 mx-auto ${
                            product.featured
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title={t('admin.products.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title={t('admin.products.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-gray-500">{t('products.noProducts')}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
