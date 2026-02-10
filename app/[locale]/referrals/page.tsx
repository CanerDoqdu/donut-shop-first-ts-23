'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReferralDashboard from '@/components/referrals/ReferralDashboard';
import { Users, LogIn } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function ReferralPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'tr';
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Arkadaşını Davet Et',
      loginRequired: 'Davet programına katılmak için giriş yapın',
      login: 'Giriş Yap',
      rewards: 'Ödüller',
      reward1: 'Her başarılı davet için 100 puan kazanın',
      reward2: 'Arkadaşınız ilk siparişinde %10 indirim kazansın',
      reward3: 'Sınırsız davet hakkı',
      reward4: 'Puanlarınız anında hesabınıza yansır',
    },
    en: {
      title: 'Refer a Friend',
      loginRequired: 'Login to join the referral program',
      login: 'Login',
      rewards: 'Rewards',
      reward1: 'Earn 100 points for every successful referral',
      reward2: 'Your friend gets 10% off their first order',
      reward3: 'Unlimited referrals',
      reward4: 'Points are credited instantly',
    },
  }[locale as 'tr' | 'en'];

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Ensure user has a referral code
        const { data: existingCode } = await supabase
          .from('referral_codes')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!existingCode) {
          // Create referral code for user
          const code = `REF-${user.id.substring(0, 8).toUpperCase()}`;
          await supabase.from('referral_codes').insert({
            user_id: user.id,
            code,
            reward_points: 100,
          });
        }
      }
      setLoading(false);
    }
    checkUser();
  }, [supabase]);

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
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{t.title}</h1>
            <p className="text-gray-600 mb-8">{t.loginRequired}</p>
            
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {t.login}
            </Link>

            <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-6 text-left">
              <h2 className="font-semibold text-gray-800 mb-4">{t.rewards}</h2>
              <ul className="space-y-3">
                {[t.reward1, t.reward2, t.reward3, t.reward4].map((reward, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    {reward}
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
        <ReferralDashboard userId={userId} locale={locale as 'tr' | 'en'} />
      </div>
    </main>
  );
}
