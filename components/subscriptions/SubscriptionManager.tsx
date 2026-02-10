'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { Package, Calendar, Pause, Play, Settings, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Subscription, SubscriptionDelivery } from '@/lib/supabase/database.types';

interface SubscriptionManagerProps {
  userId: string;
  locale: 'tr' | 'en';
}

const planConfig = {
  weekly: { discount: 15, icon: '🚀', deliveries: 4 },
  biweekly: { discount: 10, icon: '⚡', deliveries: 2 },
  monthly: { discount: 5, icon: '📦', deliveries: 1 },
};

export default function SubscriptionManager({ userId, locale }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [deliveries, setDeliveries] = useState<SubscriptionDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Abonelik Yönetimi',
      noSubscription: 'Henüz aboneliğiniz yok',
      subscribeNow: 'Şimdi Abone Ol',
      currentPlan: 'Mevcut Plan',
      weekly: 'Haftalık',
      biweekly: 'İki Haftada Bir',
      monthly: 'Aylık',
      nextDelivery: 'Sonraki Teslimat',
      status: 'Durum',
      active: 'Aktif',
      paused: 'Duraklatıldı',
      cancelled: 'İptal Edildi',
      pause: 'Duraklat',
      resume: 'Devam Et',
      modify: 'Düzenle',
      upcomingDeliveries: 'Yaklaşan Teslimatlar',
      scheduled: 'Planlandı',
      preparing: 'Hazırlanıyor',
      delivered: 'Teslim Edildi',
      skipped: 'Atlandı',
      deliveryAddress: 'Teslimat Adresi',
      pricePerDelivery: 'Teslimat Başına',
      savings: 'Tasarruf',
      quantity: 'Adet',
      perMonth: 'aylık teslimat',
      discount: 'indirim',
    },
    en: {
      title: 'Subscription Management',
      noSubscription: 'You don\'t have a subscription yet',
      subscribeNow: 'Subscribe Now',
      currentPlan: 'Current Plan',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      nextDelivery: 'Next Delivery',
      status: 'Status',
      active: 'Active',
      paused: 'Paused',
      cancelled: 'Cancelled',
      pause: 'Pause',
      resume: 'Resume',
      modify: 'Modify',
      upcomingDeliveries: 'Upcoming Deliveries',
      scheduled: 'Scheduled',
      preparing: 'Preparing',
      delivered: 'Delivered',
      skipped: 'Skipped',
      deliveryAddress: 'Delivery Address',
      pricePerDelivery: 'Per Delivery',
      savings: 'Savings',
      quantity: 'Quantity',
      perMonth: 'deliveries/month',
      discount: 'discount',
    },
  }[locale];

  const fetchSubscription = useCallback(async () => {
    const [{ data: subData }, { data: delData }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('subscription_deliveries')
        .select('*')
        .eq('subscription_id', userId)
        .order('scheduled_date', { ascending: true })
        .limit(5),
    ]);

    if (subData) setSubscription(subData);
    if (delData) setDeliveries(delData);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    startTransition(() => {
      void fetchSubscription();
    });
  }, [fetchSubscription]);

  async function togglePause() {
    if (!subscription) return;
    setUpdating(true);
    
    const newStatus = subscription.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: newStatus })
      .eq('id', subscription.id);

    if (!error) {
      setSubscription({ ...subscription, status: newStatus });
    }
    setUpdating(false);
  }

  const getPlanLabel = (plan: string) => {
    return t[plan as keyof typeof t] || plan;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: t.active,
      paused: t.paused,
      cancelled: t.cancelled,
      scheduled: t.scheduled,
      preparing: t.preparing,
      delivered: t.delivered,
      skipped: t.skipped,
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-amber-100 text-amber-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'skipped': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-16 bg-linear-to-br from-amber-50 to-pink-50 rounded-2xl">
        <Package className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.noSubscription}</h2>
        <p className="text-gray-600 mb-6">
          {locale === 'tr' 
            ? 'Düzenli teslimatlarla her zaman taze donut keyfini yaşayın!'
            : 'Enjoy fresh donuts with regular deliveries!'
          }
        </p>
        <button className="px-8 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors">
          {t.subscribeNow}
        </button>
      </div>
    );
  }

  const config = planConfig[subscription.plan_type];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>

      {/* Subscription Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-linear-to-br from-amber-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm opacity-80">{t.currentPlan}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl">{config.icon}</span>
              <h2 className="text-2xl font-bold">{getPlanLabel(subscription.plan_type)}</h2>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            subscription.status === 'active' 
              ? 'bg-white/20' 
              : 'bg-yellow-400/30'
          }`}>
            {getStatusLabel(subscription.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4">
            <Calendar className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-sm opacity-80">{t.nextDelivery}</p>
            <p className="font-semibold">
              {new Date(subscription.next_delivery_date).toLocaleDateString(
                locale === 'tr' ? 'tr-TR' : 'en-US',
                { dateStyle: 'medium' }
              )}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <Package className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-sm opacity-80">{t.quantity}</p>
            <p className="font-semibold">{subscription.quantity} {locale === 'tr' ? 'donut' : 'donuts'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div>
            <p className="text-sm opacity-80">{t.pricePerDelivery}</p>
            <p className="text-2xl font-bold">₺{subscription.price_per_delivery}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">{t.savings}</p>
            <p className="font-semibold text-green-200">%{config.discount} {t.discount}</p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={togglePause}
          disabled={updating}
          className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            subscription.status === 'active'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {subscription.status === 'active' ? (
            <>
              <Pause className="w-5 h-5" />
              {t.pause}
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              {t.resume}
            </>
          )}
        </button>
        <button className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
          <Settings className="w-5 h-5" />
          {t.modify}
        </button>
      </div>

      {/* Delivery Address */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-gray-600">
          <Truck className="w-4 h-4" />
          <span className="text-sm font-medium">{t.deliveryAddress}</span>
        </div>
        <p className="text-gray-800">{subscription.delivery_address}</p>
        {subscription.delivery_notes && (
          <p className="text-sm text-gray-500 mt-1">{subscription.delivery_notes}</p>
        )}
      </div>

      {/* Upcoming Deliveries */}
      {deliveries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">{t.upcomingDeliveries}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {new Date(delivery.scheduled_date).toLocaleDateString(
                        locale === 'tr' ? 'tr-TR' : 'en-US',
                        { dateStyle: 'full' }
                      )}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                  {getStatusLabel(delivery.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
