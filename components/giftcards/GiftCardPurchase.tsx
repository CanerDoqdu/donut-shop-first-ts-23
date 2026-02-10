'use client';

import { useState } from 'react';
import { Gift, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

interface GiftCardPurchaseProps {
  locale: 'tr' | 'en';
  onPurchase: (data: GiftCardData) => Promise<void>;
}

interface GiftCardData {
  amount: number;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  message: string;
}

const presetAmounts = [50, 100, 200, 500];

export default function GiftCardPurchase({ locale, onPurchase }: GiftCardPurchaseProps) {
  const [step, setStep] = useState<'amount' | 'details' | 'preview'>('amount');
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const t = {
    tr: {
      title: 'Hediye Kartı',
      subtitle: 'Sevdiklerinize tatlı bir jest yapın',
      selectAmount: 'Tutar Seçin',
      customAmount: 'Özel Tutar',
      yourDetails: 'Sizin Bilgileriniz',
      recipientDetails: 'Alıcı Bilgileri',
      yourName: 'Adınız',
      yourEmail: 'E-posta Adresiniz',
      recipientName: 'Alıcının Adı',
      recipientEmail: 'Alıcının E-postası',
      message: 'Mesajınız (opsiyonel)',
      messagePlaceholder: 'Kişisel bir mesaj ekleyin...',
      continue: 'Devam Et',
      back: 'Geri',
      preview: 'Önizleme',
      from: 'Gönderen',
      to: 'Alıcı',
      purchase: 'Satın Al',
      processing: 'İşleniyor...',
      success: 'Hediye kartı başarıyla oluşturuldu!',
      emailSent: 'E-posta gönderildi',
    },
    en: {
      title: 'Gift Card',
      subtitle: 'Give a sweet treat to your loved ones',
      selectAmount: 'Select Amount',
      customAmount: 'Custom Amount',
      yourDetails: 'Your Details',
      recipientDetails: 'Recipient Details',
      yourName: 'Your Name',
      yourEmail: 'Your Email',
      recipientName: 'Recipient Name',
      recipientEmail: 'Recipient Email',
      message: 'Message (optional)',
      messagePlaceholder: 'Add a personal message...',
      continue: 'Continue',
      back: 'Back',
      preview: 'Preview',
      from: 'From',
      to: 'To',
      purchase: 'Purchase',
      processing: 'Processing...',
      success: 'Gift card created successfully!',
      emailSent: 'Email sent',
    },
  }[locale];

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  async function handlePurchase() {
    setSubmitting(true);
    setError('');
    try {
      await onPurchase({
        amount: finalAmount,
        senderName,
        senderEmail,
        recipientName,
        recipientEmail,
        message,
      });
      // If we get here without redirect, something went wrong
    } catch (err) {
      setError(locale === 'tr' ? 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.' : 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-linear-to-br from-amber-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">{t.title}</h1>
        <p className="text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {['amount', 'details', 'preview'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s 
                ? 'bg-amber-500 text-white' 
                : i < ['amount', 'details', 'preview'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}>
              {i + 1}
            </div>
            {i < 2 && <div className={`w-12 h-0.5 ${
              i < ['amount', 'details', 'preview'].indexOf(step) ? 'bg-green-500' : 'bg-gray-200'
            }`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Amount */}
      {step === 'amount' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <h2 className="text-xl font-semibold text-gray-800">{t.selectAmount}</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => { setAmount(amt); setCustomAmount(''); }}
                className={`py-5 sm:py-4 rounded-xl font-semibold text-lg transition-all ${
                  amount === amt && !customAmount
                    ? 'bg-amber-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ₺{amt}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.customAmount}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₺</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-0 text-lg"
                placeholder="0"
                min="10"
                max="5000"
              />
            </div>
          </div>

          <button
            onClick={() => setStep('details')}
            disabled={!finalAmount || finalAmount < 10}
            className="w-full py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.continue}
          </button>
        </motion.div>
      )}

      {/* Step 2: Details */}
      {step === 'details' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.yourDetails}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.yourName}</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.yourEmail}</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-0"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.recipientDetails}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipientName}</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipientEmail}</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-0"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.message}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-0 resize-none"
              placeholder={t.messagePlaceholder}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('amount')}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              {t.back}
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={!senderName || !senderEmail || !recipientName || !recipientEmail}
              className="flex-1 py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {t.continue}
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <h2 className="text-xl font-semibold text-gray-800">{t.preview}</h2>

          {/* Gift Card Preview */}
          <div className="relative bg-linear-to-br from-amber-400 via-pink-400 to-purple-500 rounded-2xl p-6 text-white shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Gift className="w-8 h-8" />
                <span className="text-xl font-bold">Donut Shop Gift Card</span>
              </div>

              <p className="text-4xl font-bold mb-6">₺{finalAmount}</p>

              <div className="space-y-2 text-sm">
                <p><span className="opacity-75">{t.from}:</span> {senderName}</p>
                <p><span className="opacity-75">{t.to}:</span> {recipientName}</p>
                {message && (
                  <p className="mt-4 italic bg-white/10 rounded-lg p-3">&ldquo;{message}&rdquo;</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              {t.back}
            </button>
            <button
              onClick={handlePurchase}
              disabled={submitting}
              className="flex-1 py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {submitting ? t.processing : `${t.purchase} - ₺${finalAmount}`}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
