'use client';

import { useState, useEffect, type ElementType } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import AdminDashboard from '@/components/admin/AdminDashboard';
import InventoryManager from '@/components/admin/InventoryManager';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, Settings, 
  ChevronLeft, Menu, X, Store, Crown, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'dashboard' | 'orders' | 'inventory' | 'customers' | 'stores' | 'settings';

export default function AdminPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'tr';
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const supabase = createClient();

  const t = {
    tr: {
      adminPanel: 'Yönetim Paneli',
      dashboard: 'Dashboard',
      orders: 'Siparişler',
      inventory: 'Stok Yönetimi',
      customers: 'Müşteriler',
      stores: 'Mağazalar',
      settings: 'Ayarlar',
      backToSite: 'Siteye Dön',
      notAuthorized: 'Bu sayfaya erişim yetkiniz yok',
      goBack: 'Ana Sayfaya Dön',
    },
    en: {
      adminPanel: 'Admin Panel',
      dashboard: 'Dashboard',
      orders: 'Orders',
      inventory: 'Inventory',
      customers: 'Customers',
      stores: 'Stores',
      settings: 'Settings',
      backToSite: 'Back to Site',
      notAuthorized: 'You are not authorized to access this page',
      goBack: 'Go to Homepage',
    },
  }[locale as 'tr' | 'en'];

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (adminData) {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    }
    checkAdmin();
  }, [supabase]);

  const navItems: { id: Tab; label: string; icon: ElementType }[] = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'orders', label: t.orders, icon: ShoppingBag },
    { id: 'inventory', label: t.inventory, icon: Package },
    { id: 'customers', label: t.customers, icon: Users },
    { id: 'stores', label: t.stores, icon: Store },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{t.notAuthorized}</h1>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            {t.goBack}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="w-64 bg-white border-r border-gray-200 fixed h-full z-30"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-800">{t.adminPanel}</span>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                {t.backToSite}
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 transition-all ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && <AdminDashboard locale={locale as 'tr' | 'en'} />}
          {activeTab === 'inventory' && <InventoryManager locale={locale as 'tr' | 'en'} />}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
              Orders management coming soon...
            </div>
          )}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
              Customer management coming soon...
            </div>
          )}
          {activeTab === 'stores' && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
              Store management coming soon...
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
              Settings coming soon...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
