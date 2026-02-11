'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, MapPin, Package, Crown, Gift, 
  Users, LogOut, ChevronRight, Edit2, Save,
  ShoppingBag, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { updateProfile, signOut } from '@/lib/auth/actions';

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
}

interface LoyaltyInfo {
  total_points: number;
  tier: string;
  lifetime_points: number;
}

export default function AccountPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Hesabım',
      profile: 'Profil Bilgileri',
      orders: 'Siparişlerim',
      loyalty: 'Sadakat Puanı',
      referrals: 'Davetlerim',
      giftCards: 'Hediye Kartlarım',
      subscriptions: 'Aboneliklerim',
      settings: 'Ayarlar',
      logout: 'Çıkış Yap',
      fullName: 'Ad Soyad',
      email: 'E-posta',
      phone: 'Telefon',
      address: 'Adres',
      edit: 'Düzenle',
      save: 'Kaydet',
      cancel: 'İptal',
      saving: 'Kaydediliyor...',
      saved: 'Kaydedildi!',
      points: 'Puan',
      tier: 'Seviye',
      recentOrders: 'Son Siparişler',
      viewAll: 'Tümünü Gör',
      noOrders: 'Henüz sipariş yok',
      pending: 'Beklemede',
      paid: 'Ödendi',
      preparing: 'Hazırlanıyor',
      shipped: 'Kargoda',
      delivered: 'Teslim Edildi',
      quickLinks: 'Hızlı Erişim',
      loginRequired: 'Bu sayfayı görüntülemek için giriş yapmalısınız',
      login: 'Giriş Yap',
    },
    en: {
      title: 'My Account',
      profile: 'Profile Information',
      orders: 'My Orders',
      loyalty: 'Loyalty Points',
      referrals: 'My Referrals',
      giftCards: 'My Gift Cards',
      subscriptions: 'My Subscriptions',
      settings: 'Settings',
      logout: 'Log Out',
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      saving: 'Saving...',
      saved: 'Saved!',
      points: 'Points',
      tier: 'Tier',
      recentOrders: 'Recent Orders',
      viewAll: 'View All',
      noOrders: 'No orders yet',
      pending: 'Pending',
      paid: 'Paid',
      preparing: 'Preparing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      quickLinks: 'Quick Links',
      loginRequired: 'You must be logged in to view this page',
      login: 'Log In',
    },
  }[locale as 'tr' | 'en'];

  useEffect(() => {
    // Wait for AuthProvider to finish loading
    if (authLoading) return;

    async function fetchAccountData(userId: string) {
      const [profileRes, loyaltyRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('loyalty_points').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('orders').select('id, total_amount, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (loyaltyRes.data) setLoyalty(loyaltyRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
      setLoading(false);
    }

    if (authUser) {
      fetchAccountData(authUser.id);
    } else {
      setLoading(false);
    }
  }, [authUser, authLoading, supabase]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

    if (result.success) {
      setSuccess(true);
      setEditing(false);
      // Refresh profile
      const { data } = await supabase.from('profiles').select('*').eq('id', displayProfile.id).maybeSingle();
      if (data) setProfile(data);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Error saving profile');
    }
    setSaving(false);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'paid': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-purple-100 text-purple-700';
      case 'shipped': return 'bg-orange-100 text-orange-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t.pending,
      paid: t.paid,
      preparing: t.preparing,
      shipped: t.shipped,
      delivered: t.delivered,
    };
    return labels[status] || status;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-amber-600 to-amber-700';
      case 'silver': return 'from-gray-400 to-gray-500';
      case 'gold': return 'from-yellow-400 to-yellow-500';
      case 'platinum': return 'from-purple-400 to-purple-600';
      default: return 'from-amber-600 to-amber-700';
    }
  };

  const quickLinks = [
    { href: '/loyalty' as const, icon: Crown, label: t.loyalty, color: 'bg-amber-100 text-amber-600' },
    { href: '/orders' as const, icon: Package, label: t.orders, color: 'bg-blue-100 text-blue-600' },
    { href: '/referrals' as const, icon: Users, label: t.referrals, color: 'bg-green-100 text-green-600' },
    { href: '/gift-cards' as const, icon: Gift, label: t.giftCards, color: 'bg-pink-100 text-pink-600' },
    { href: '/subscriptions' as const, icon: ShoppingBag, label: t.subscriptions, color: 'bg-purple-100 text-purple-600' },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!authUser && !profile) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{t.loginRequired}</h1>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
          >
            {t.login}
          </Link>
        </div>
      </main>
    );
  }

  // Build a display profile — use DB profile if available, otherwise fall back to auth user
  const displayProfile: Profile = profile ?? {
    id: authUser?.id ?? '',
    email: authUser?.email ?? null,
    full_name: authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? null,
    phone: authUser?.phone ?? null,
    address: null,
    avatar_url: authUser?.user_metadata?.avatar_url ?? null,
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">{t.title}</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">{t.profile}</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 text-amber-600 hover:text-amber-700"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t.edit}
                  </button>
                ) : null}
              </div>

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-green-700">{t.saved}</p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.fullName}</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="fullName"
                        defaultValue={displayProfile.full_name || ''}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={displayProfile.phone || ''}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.address}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        name="address"
                        defaultValue={displayProfile.address || ''}
                        rows={2}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="flex-1 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t.saving}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {t.save}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t.fullName}</p>
                      <p className="font-medium">{displayProfile.full_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t.email}</p>
                      <p className="font-medium">{displayProfile.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t.phone}</p>
                      <p className="font-medium">{displayProfile.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t.address}</p>
                      <p className="font-medium">{displayProfile.address || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">{t.recentOrders}</h2>
                <Link
                  href="/orders"
                  className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  {t.viewAll}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>{t.noOrders}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={{ pathname: '/orders/[id]', params: { id: order.id } }}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">#{order.id.substring(0, 8)}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString(locale)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₺{order.total_amount.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Loyalty Card */}
            {loyalty && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`bg-linear-to-br ${getTierColor(loyalty.tier)} rounded-2xl p-6 text-white shadow-lg`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Crown className="w-8 h-8" />
                  <span className="text-xs uppercase tracking-wider opacity-80">{t.tier}</span>
                </div>
                <p className="text-3xl font-bold mb-1">{loyalty.total_points}</p>
                <p className="text-sm opacity-80">{t.points}</p>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-sm capitalize">{loyalty.tier}</p>
                </div>
              </motion.div>
            )}

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm p-4"
            >
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{t.quickLinks}</h3>
              <div className="space-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-700">{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Logout */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 p-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  {t.logout}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
