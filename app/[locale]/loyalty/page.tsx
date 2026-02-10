'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LoyaltyDashboard from '@/components/loyalty/LoyaltyDashboard';
import { Crown, LogIn } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function LoyaltyPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'tr';
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Sadakat Programı',
      loginRequired: 'Sadakat puanlarınızı görmek için giriş yapın',
      login: 'Giriş Yap',
      benefits: 'Avantajlar',
      benefit1: 'Her ₺10 harcamada 1 puan kazanın',
      benefit2: '100 puan = ₺10 indirim',
      benefit3: 'Üst seviye üyeliklerle daha fazla puan',
      benefit4: 'Özel kampanyalara erken erişim',
    },
    en: {
      title: 'Loyalty Program',
      loginRequired: 'Login to see your loyalty points',
      login: 'Login',
      benefits: 'Benefits',
      benefit1: 'Earn 1 point for every ₺10 spent',
      benefit2: '100 points = ₺10 discount',
      benefit3: 'Higher tiers earn more points',
      benefit4: 'Early access to special campaigns',
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
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-60 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{t.title}</h1>
            <p className="text-gray-600 mb-8">{t.loginRequired}</p>
            
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {t.login}
            </Link>

            <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-6 text-left">
              <h2 className="font-semibold text-gray-800 mb-4">{t.benefits}</h2>
              <ul className="space-y-3">
                {[t.benefit1, t.benefit2, t.benefit3, t.benefit4].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <LoyaltyDashboard userId={userId} locale={locale as 'tr' | 'en'} />
      </div>
    </main>
  );
}
