'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { 
  Package, Search, AlertTriangle, Plus, Minus, 
  Save, RefreshCw, ArrowUpDown 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface InventoryManagerProps {
  locale: 'tr' | 'en';
  storeId?: string;
}

interface ProductWithInventory {
  id: string;
  name_tr: string;
  name_en: string;
  category: string;
  stock: number;
  price: number;
  image_url: string;
  storeStock?: number;
}

export default function InventoryManager({ locale, storeId }: InventoryManagerProps) {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Stok Yönetimi',
      search: 'Ürün ara...',
      allCategories: 'Tüm Kategoriler',
      allStock: 'Tüm Stok',
      lowStock: 'Düşük Stok',
      outOfStock: 'Stokta Yok',
      product: 'Ürün',
      category: 'Kategori',
      currentStock: 'Mevcut Stok',
      price: 'Fiyat',
      actions: 'İşlemler',
      save: 'Kaydet',
      saved: 'Kaydedildi!',
      refresh: 'Yenile',
      lowStockAlert: 'Düşük stok uyarısı!',
      outOfStockAlert: 'Stok tükendi!',
      glazed: 'Klasik',
      filled: 'Dolgulu',
      specialty: 'Özel',
      seasonal: 'Mevsimsel',
      beverage: 'İçecek',
      units: 'adet',
    },
    en: {
      title: 'Inventory Management',
      search: 'Search products...',
      allCategories: 'All Categories',
      allStock: 'All Stock',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      product: 'Product',
      category: 'Category',
      currentStock: 'Current Stock',
      price: 'Price',
      actions: 'Actions',
      save: 'Save',
      saved: 'Saved!',
      refresh: 'Refresh',
      lowStockAlert: 'Low stock alert!',
      outOfStockAlert: 'Out of stock!',
      glazed: 'Glazed',
      filled: 'Filled',
      specialty: 'Specialty',
      seasonal: 'Seasonal',
      beverage: 'Beverage',
      units: 'units',
    },
  }[locale];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    
    const query = supabase.from('products').select('*');
    
    const { data, error } = await query;
    
    if (!error && data) {
      // If storeId is provided, fetch store-specific inventory
      if (storeId) {
        const { data: inventory } = await supabase
          .from('store_inventory')
          .select('product_id, stock')
          .eq('store_id', storeId);
        
        const inventoryMap = new Map(inventory?.map(i => [i.product_id, i.stock]) || []);
        setProducts(data.map(p => ({
          ...p,
          storeStock: inventoryMap.get(p.id) || 0,
        })));
      } else {
        setProducts(data);
      }
    }
    setLoading(false);
  }, [supabase, storeId]);

  useEffect(() => {
    startTransition(() => {
      void fetchProducts();
    });
  }, [fetchProducts]);

  async function updateStock(productId: string, newStock: number) {
    setSaving(productId);
    
    const { error } = storeId
      ? await supabase
          .from('store_inventory')
          .upsert({
            store_id: storeId,
            product_id: productId,
            stock: newStock,
          })
      : await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId);

    if (!error) {
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, stock: storeId ? p.stock : newStock, storeStock: storeId ? newStock : p.storeStock }
          : p
      ));
      setEditingStock(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
    
    setTimeout(() => setSaving(null), 1000);
  }

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      glazed: t.glazed,
      filled: t.filled,
      specialty: t.specialty,
      seasonal: t.seasonal,
      beverage: t.beverage,
    };
    return labels[cat] || cat;
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'bg-red-100 text-red-700', label: t.outOfStockAlert };
    if (stock < 10) return { color: 'bg-yellow-100 text-yellow-700', label: t.lowStockAlert };
    return { color: 'bg-green-100 text-green-700', label: `${stock} ${t.units}` };
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(p => {
      const name = locale === 'tr' ? p.name_tr : p.name_en;
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const stock = storeId ? p.storeStock || 0 : p.stock;
      const matchesStock = 
        stockFilter === 'all' ||
        (stockFilter === 'low' && stock > 0 && stock < 10) ||
        (stockFilter === 'out' && stock === 0);
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      const aStock = storeId ? a.storeStock || 0 : a.stock;
      const bStock = storeId ? b.storeStock || 0 : b.stock;
      const aName = locale === 'tr' ? a.name_tr : a.name_en;
      const bName = locale === 'tr' ? b.name_tr : b.name_en;
      
      let comparison = 0;
      if (sortBy === 'name') comparison = aName.localeCompare(bName);
      else if (sortBy === 'stock') comparison = aStock - bStock;
      else if (sortBy === 'price') comparison = a.price - b.price;
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const categories = ['all', 'glazed', 'filled', 'specialty', 'seasonal', 'beverage'];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-7 h-7 text-amber-500" />
          {t.title}
        </h1>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t.refresh}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? t.allCategories : getCategoryLabel(cat)}
            </option>
          ))}
        </select>

        {/* Stock Filter */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="all">{t.allStock}</option>
          <option value="low">{t.lowStock}</option>
          <option value="out">{t.outOfStock}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                    className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-800"
                  >
                    {t.product}
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">{t.category}</th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => { setSortBy('stock'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                    className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-800"
                  >
                    {t.currentStock}
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => { setSortBy('price'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                    className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-800"
                  >
                    {t.price}
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right font-semibold text-gray-600">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => {
                const stock = storeId ? product.storeStock || 0 : product.stock;
                const editedStock = editingStock[product.id];
                const currentStock = editedStock !== undefined ? editedStock : stock;
                const status = getStockStatus(stock);
                const name = locale === 'tr' ? product.name_tr : product.name_en;

                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image_url}
                          alt={name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="font-medium text-gray-800">{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        {getCategoryLabel(product.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {stock < 10 && stock > 0 && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                        {stock === 0 && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      ₺{product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingStock(prev => ({
                            ...prev,
                            [product.id]: Math.max(0, currentStock - 1),
                          }))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={currentStock}
                          onChange={(e) => setEditingStock(prev => ({
                            ...prev,
                            [product.id]: Math.max(0, parseInt(e.target.value) || 0),
                          }))}
                          className="w-16 text-center border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => setEditingStock(prev => ({
                            ...prev,
                            [product.id]: currentStock + 1,
                          }))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {editedStock !== undefined && editedStock !== stock && (
                          <button
                            onClick={() => updateStock(product.id, editedStock)}
                            disabled={saving === product.id}
                            className="ml-2 px-3 py-1 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {saving === product.id ? (
                              <>{t.saved}</>
                            ) : (
                              <>
                                <Save className="w-3 h-3" />
                                {t.save}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
