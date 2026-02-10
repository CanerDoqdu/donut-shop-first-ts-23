'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { Users, Gift, Copy, Check, Share2, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { ReferralCode, Referral } from '@/lib/supabase/database.types';

interface ReferralDashboardProps {
  userId: string;
  locale: 'tr' | 'en';
}

export default function ReferralDashboard({ userId, locale }: ReferralDashboardProps) {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const t = {
    tr: {
      title: 'Arkadaşını Davet Et',
      subtitle: 'Arkadaşlarını davet et, birlikte kazan!',
      yourCode: 'Davet Kodunuz',
      copyCode: 'Kodu Kopyala',
      copied: 'Kopyalandı!',
      shareLink: 'Bağlantıyı Paylaş',
      howItWorks: 'Nasıl Çalışır?',
      step1: 'Kodunuzu paylaşın',
      step1Desc: 'Arkadaşlarınıza özel davet kodunuzu gönderin',
      step2: 'Arkadaşınız alışveriş yapsın',
      step2Desc: 'İlk siparişlerinde kodunuzu kullansınlar',
      step3: 'İkiniz de kazanın',
      step3Desc: 'Siz puan, arkadaşınız %10 indirim kazansın',
      yourReferrals: 'Davetleriniz',
      totalReferred: 'Toplam Davet',
      pendingRewards: 'Bekleyen Ödül',
      completedRewards: 'Kazanılan Puan',
      pending: 'Beklemede',
      completed: 'Tamamlandı',
      noReferrals: 'Henüz davet yok',
      points: 'puan',
      rewardPerReferral: 'davet başına puan',
    },
    en: {
      title: 'Refer a Friend',
      subtitle: 'Invite friends and earn together!',
      yourCode: 'Your Referral Code',
      copyCode: 'Copy Code',
      copied: 'Copied!',
      shareLink: 'Share Link',
      howItWorks: 'How It Works?',
      step1: 'Share your code',
      step1Desc: 'Send your unique referral code to friends',
      step2: 'Friend makes a purchase',
      step2Desc: 'They use your code on their first order',
      step3: 'You both win',
      step3Desc: 'You get points, they get 10% off',
      yourReferrals: 'Your Referrals',
      totalReferred: 'Total Referred',
      pendingRewards: 'Pending Rewards',
      completedRewards: 'Earned Points',
      pending: 'Pending',
      completed: 'Completed',
      noReferrals: 'No referrals yet',
      points: 'points',
      rewardPerReferral: 'points per referral',
    },
  }[locale];

  const fetchReferralData = useCallback(async () => {
    const [{ data: codeData }, { data: refsData }] = await Promise.all([
      supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (codeData) setReferralCode(codeData);
    if (refsData) setReferrals(refsData);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    startTransition(() => {
      void fetchReferralData();
    });
  }, [fetchReferralData]);

  async function copyCode() {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!referralCode) return;
    const shareUrl = `${window.location.origin}?ref=${referralCode.code}`;
    
    if (navigator.share) {
      await navigator.share({
        title: locale === 'tr' ? 'Donut Shop Davetiye' : 'Donut Shop Referral',
        text: locale === 'tr' 
          ? `Bu kodu kullanarak ilk siparişinde %10 indirim kazan: ${referralCode.code}`
          : `Use this code to get 10% off your first order: ${referralCode.code}`,
        url: shareUrl,
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  const completedReferrals = referrals.filter(r => r.status === 'completed');
  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  const totalEarned = completedReferrals.length * (referralCode?.reward_points || 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
        <p className="text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Referral Code Card */}
      {referralCode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white"
        >
          <p className="text-sm opacity-80 mb-2">{t.yourCode}</p>
          <div className="flex items-center justify-between bg-white/20 rounded-xl p-4 mb-4">
            <span className="text-2xl font-mono font-bold tracking-wider">{referralCode.code}</span>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  {t.copied}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t.copyCode}
                </>
              )}
            </button>
          </div>
          <button
            onClick={shareLink}
            className="w-full py-3 bg-white/20 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            {t.shareLink}
          </button>
          <p className="text-center text-sm mt-4 opacity-80">
            {referralCode.reward_points} {t.rewardPerReferral}
          </p>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800">{referrals.length}</p>
          <p className="text-xs text-gray-500">{t.totalReferred}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <Gift className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800">{pendingReferrals.length}</p>
          <p className="text-xs text-gray-500">{t.pendingRewards}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800">{totalEarned}</p>
          <p className="text-xs text-gray-500">{t.completedRewards}</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-800 mb-4">{t.howItWorks}</h3>
        <div className="space-y-4">
          {[
            { step: 1, title: t.step1, desc: t.step1Desc, icon: Share2  },
            { step: 2, title: t.step2, desc: t.step2Desc, icon: Gift },
            { step: 3, title: t.step3, desc: t.step3Desc, icon: Trophy },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{t.yourReferrals}</h3>
        </div>
        {referrals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t.noReferrals}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {locale === 'tr' ? 'Davet Edilen Kullanıcı' : 'Referred User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(ref.created_at).toLocaleDateString(
                        locale === 'tr' ? 'tr-TR' : 'en-US'
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ref.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {ref.status === 'completed' ? t.completed : t.pending}
                  </span>
                  {ref.status === 'completed' && (
                    <p className="text-xs text-green-600 mt-1">
                      +{referralCode?.reward_points || 100} {t.points}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
