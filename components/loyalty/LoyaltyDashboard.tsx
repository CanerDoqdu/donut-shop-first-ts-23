'use client';

import { useState, useEffect } from 'react';
import { Crown, Star, Gift, TrendingUp, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { LoyaltyPoints, PointsTransaction } from '@/lib/supabase/database.types';

interface LoyaltyDashboardProps {
  userId: string;
  locale: 'tr' | 'en';
}

const tierConfig = {
  bronze: { color: 'from-amber-600 to-amber-700', icon: '🥉', minPoints: 0, multiplier: 1 },
  silver: { color: 'from-gray-400 to-gray-500', icon: '🥈', minPoints: 500, multiplier: 1.25 },
  gold: { color: 'from-yellow-400 to-yellow-500', icon: '🥇', minPoints: 2000, multiplier: 1.5 },
  platinum: { color: 'from-purple-400 to-purple-600', icon: '💎', minPoints: 5000, multiplier: 2 },
};

export default function LoyaltyDashboard({ userId, locale }: LoyaltyDashboardProps) {
  const [loyalty, setLoyalty] = useState<LoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Sadakat Programı',
      yourPoints: 'Puanlarınız',
      tier: 'Seviye',
      lifetimePoints: 'Toplam Kazanılan',
      nextTier: 'Sonraki Seviye',
      pointsNeeded: 'puan gerekli',
      recentActivity: 'Son İşlemler',
      earned: 'Kazanılan',
      redeemed: 'Harcanan',
      bonus: 'Bonus',
      referral: 'Davetiye',
      expired: 'Süresi Dolmuş',
      noTransactions: 'Henüz işlem yok',
      earnRate: 'Her ₺10 = 1 Puan',
      redeemRate: '100 Puan = ₺10 İndirim',
      multiplier: 'Puan Çarpanı',
    },
    en: {
      title: 'Loyalty Program',
      yourPoints: 'Your Points',
      tier: 'Tier',
      lifetimePoints: 'Lifetime Points',
      nextTier: 'Next Tier',
      pointsNeeded: 'points needed',
      recentActivity: 'Recent Activity',
      earned: 'Earned',
      redeemed: 'Redeemed',
      bonus: 'Bonus',
      referral: 'Referral',
      expired: 'Expired',
      noTransactions: 'No transactions yet',
      earnRate: 'Every ₺10 = 1 Point',
      redeemRate: '100 Points = ₺10 Discount',
      multiplier: 'Points Multiplier',
    },
  }[locale];

  useEffect(() => {
    async function fetchLoyaltyData() {
      const [{ data: loyaltyData }, { data: txData }] = await Promise.all([
        supabase
          .from('loyalty_points')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('points_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (loyaltyData) setLoyalty(loyaltyData);
      if (txData) setTransactions(txData);
      setLoading(false);
    }

    fetchLoyaltyData();
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="h-60 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  const tier = loyalty?.tier || 'bronze';
  const config = tierConfig[tier];
  const nextTiers = Object.entries(tierConfig).filter(
    ([, v]) => v.minPoints > (loyalty?.lifetime_points || 0)
  );
  const nextTier = nextTiers[0];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earned': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'redeemed': return <Gift className="w-4 h-4 text-purple-500" />;
      case 'bonus': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'referral': return <Crown className="w-4 h-4 text-blue-500" />;
      default: return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      earned: t.earned,
      redeemed: t.redeemed,
      bonus: t.bonus,
      referral: t.referral,
      expired: t.expired,
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Points Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${config.color} p-6 text-white shadow-xl`}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium opacity-90">{t.title}</h2>
            <span className="text-3xl">{config.icon}</span>
          </div>
          
          <div className="mb-6">
            <p className="text-sm opacity-75">{t.yourPoints}</p>
            <p className="text-4xl font-bold">{loyalty?.total_points?.toLocaleString() || 0}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="opacity-75">{t.tier}</p>
              <p className="font-semibold capitalize">{tier}</p>
            </div>
            <div>
              <p className="opacity-75">{t.lifetimePoints}</p>
              <p className="font-semibold">{loyalty?.lifetime_points?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="opacity-75">{t.multiplier}</p>
              <p className="font-semibold">{config.multiplier}x</p>
            </div>
          </div>

          {nextTier && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>{t.nextTier}: {nextTier[0]}</span>
                <span>{nextTier[1].minPoints - (loyalty?.lifetime_points || 0)} {t.pointsNeeded}</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min(
                      100,
                      ((loyalty?.lifetime_points || 0) / nextTier[1].minPoints) * 100
                    )}%` 
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-sm text-green-800 font-medium">{t.earnRate}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <Gift className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-sm text-purple-800 font-medium">{t.redeemRate}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <History className="w-5 h-5" />
            {t.recentActivity}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-50">
          {transactions.length === 0 ? (
            <p className="p-8 text-center text-gray-500">{t.noTransactions}</p>
          ) : (
            transactions.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{getTypeLabel(tx.type)}</p>
                    <p className="text-xs text-gray-500">{tx.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    tx.points > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
