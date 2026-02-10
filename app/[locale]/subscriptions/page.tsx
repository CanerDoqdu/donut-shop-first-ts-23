'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SubscriptionManager from '@/components/subscriptions/SubscriptionManager';
import { Package, LogIn, Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';

const plans = [
  { id: 'weekly', deliveries: 4, discount: 15, iconColor: 'bg-green-500' },
  { id: 'biweekly', deliveries: 2, discount: 10, iconColor: 'bg-blue-500' },
  { id: 'monthly', deliveries: 1, discount: 5, iconColor: 'bg-purple-500' },
];

export default function SubscriptionsPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'tr';
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Abonelik Paketleri',
      subtitle: 'Düzenli teslimatlarla her zaman taze donut keyfini yaşayın',
      loginRequired: 'Abonelik oluşturmak için giriş yapın',
      login: 'Giriş Yap',
      weekly: 'Haftalık',
      biweekly: 'İki Haftada Bir',
      monthly: 'Aylık',
      deliveries: 'teslimat/ay',
      discount: 'indirim',
      popular: 'En Popüler',
      startingFrom: 'Başlayan fiyat',
      perDelivery: '/teslimat',
      features: 'Tüm planlarda',
      feature1: 'Ücretsiz teslimat',
      feature2: 'İstediğiniz zaman iptal',
      feature3: 'Esnek ürün seçimi',
      feature4: 'Teslimat gününü seçin',
      choosePlan: 'Planı Seç',
    },
    en: {
      title: 'Subscription Plans',
      subtitle: 'Enjoy fresh donuts with regular deliveries',
      loginRequired: 'Login to create a subscription',
      login: 'Login',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      deliveries: 'deliveries/mo',
      discount: 'off',
      popular: 'Most Popular',
      startingFrom: 'Starting from',
      perDelivery: '/delivery',
      features: 'All plans include',
      feature1: 'Free delivery',
      feature2: 'Cancel anytime',
      feature3: 'Flexible product selection',
      feature4: 'Choose your delivery day',
      choosePlan: 'Choose Plan',
    },
  }[locale as 'tr' | 'en'];

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      setLoading(false);
    }
    checkUser();
  }, [supabase.auth]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3 mx-auto" />
            <div className="grid grid-cols-3 gap-6 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-80 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // If user has subscription, show manager
  if (userId) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <SubscriptionManager userId={userId} locale={locale as 'tr' | 'en'} />
        </div>
      </main>
    );
  }

  // Show plans for non-logged users
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{t.title}</h1>
          <p className="text-gray-600 mt-2">{t.subtitle}</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, index) => {
            const isPopular = plan.id === 'biweekly';
            const planLabel = t[plan.id as keyof typeof t] as string;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-white rounded-2xl border-2 p-6 ${
                  isPopular ? 'border-amber-500 shadow-xl' : 'border-gray-100'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-white text-sm font-medium rounded-full">
                    {t.popular}
                  </span>
                )}

                <div className={`w-12 h-12 ${plan.iconColor} rounded-xl flex items-center justify-center mb-4`}>
                  <Package className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-800">{planLabel}</h3>
                <p className="text-gray-500 mt-1">{plan.deliveries} {t.deliveries}</p>

                <div className="my-6">
                  <span className="text-3xl font-bold text-gray-800">%{plan.discount}</span>
                  <span className="text-gray-500 ml-1">{t.discount}</span>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  {t.startingFrom} <span className="font-semibold text-gray-800">₺49</span>{t.perDelivery}
                </p>

                <Link
                  href="/login"
                  className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isPopular
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.choosePlan}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="font-semibold text-gray-800 mb-6 text-center">{t.features}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[t.feature1, t.feature2, t.feature3, t.feature4].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-600">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Login CTA */}
        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">{t.loginRequired}</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            {t.login}
          </Link>
        </div>
      </div>
    </main>
  );
}
