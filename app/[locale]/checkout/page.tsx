'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import Image from 'next/image';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { Loader2, Tag, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useFormValidation, useCheckoutMachine } from '@/hooks';
import { checkoutSchema } from '@/lib/validations';
import { FieldError } from '@/components/ui/field-error';
import { CHECKOUT_TIMEOUT_MS } from '@/lib/constants';
import { getRetryCooldownMs } from '@/hooks/use-checkout-machine';

export default function CheckoutPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { items, getTotalPrice } = useCartStore();
  const machine = useCheckoutMachine();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<{ discountValue: number; discountType: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [retryCooldown, setRetryCooldown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
  });

  const { fieldErrors, validateField, validateAll } = useFormValidation(checkoutSchema);

  const subtotal = getTotalPrice();
  const discount = promoDiscount?.discountValue ?? 0;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = taxableAmount * 0.18;
  const total = taxableAmount + tax;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoDiscount(null);

    try {
      const res = await fetch('/api/checkout/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid promo code');
      setPromoDiscount({ discountValue: data.discountValue, discountType: data.discountType });
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Invalid promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoDiscount(null);
    setPromoError('');
  };

  // Redirect to cart if no items
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items.length, router]);

  // Retry cooldown timer
  useEffect(() => {
    if (retryCooldown <= 0) return;
    const id = setInterval(() => setRetryCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [retryCooldown]);

  // Clean up machine on successful redirect
  useEffect(() => {
    if (machine.state === 'success') {
      machine.reset();
    }
  }, [machine]);

  const handleRetry = useCallback(() => {
    if (!machine.canRetry) return;
    const cooldownMs = getRetryCooldownMs(machine.retryCount);
    setRetryCooldown(Math.ceil(cooldownMs / 1000));
    machine.send({ type: 'RETRY' });
  }, [machine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Start the state machine
    machine.send({ type: 'START_CHECKOUT' });

    // Validate form
    const valid = validateAll({
      customerEmail: formData.email,
      customerName: formData.name,
      customerPhone: formData.phone,
      customerAddress: formData.address,
    });

    if (!valid) {
      machine.send({ type: 'VALIDATION_FAIL', error: 'Form validation failed' });
      return;
    }

    machine.send({ type: 'VALIDATION_OK' });

    try {
      // Set up timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS);

      // Call checkout API to create Stripe session & save order to Supabase
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            id: i.product.id,
            quantity: i.quantity,
          })),
          customerEmail: formData.email,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          locale,
          ...(promoDiscount ? { promoCode: promoCode.trim() } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Transition to redirecting and hand off to Stripe
      machine.send({ type: 'RESERVATION_OK', url: data.url });
      window.location.href = data.url;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        machine.send({ type: 'TIMEOUT' });
      } else {
        const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
        machine.send({ type: 'RESERVATION_FAIL', error: message });
      }
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-fredoka text-4xl font-bold mb-8 bg-gradient-donut bg-clip-text text-transparent">
        {t('checkout.title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Information Form */}
        <Card>
          <CardContent className="p-6">
            <CardTitle className="mb-6">{t('checkout.customerInfo')}</CardTitle>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.email')} *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={(e) => validateField('customerEmail', e.target.value)}
                  placeholder="your@email.com"
                  className={fieldErrors.customerEmail ? 'border-red-300 focus:ring-red-400' : ''}
                />
                <FieldError message={fieldErrors.customerEmail} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.name')} *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onBlur={(e) => validateField('customerName', e.target.value)}
                  placeholder="John Doe"
                  className={fieldErrors.customerName ? 'border-red-300 focus:ring-red-400' : ''}
                />
                <FieldError message={fieldErrors.customerName} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.phone')} *
                </label>
                <Input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+90 555 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('checkout.address')} *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full delivery address"
                />
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                  Siparişimi onaylayarak{' '}
                  <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">
                    Satış Sözleşmesi
                  </span>
                  ,{' '}
                  <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">
                    Gizlilik Politikası
                  </span>
                  {' '}ve{' '}
                  <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">
                    İade Koşulları
                  </span>
                  &apos;nı okuduğumu ve kabul ettiğimi onaylıyorum.
                </label>
              </div>

              <Button type="submit" className="w-full mt-6" size="lg" disabled={machine.isBusy || !termsAccepted}>
                {machine.isBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {machine.state === 'validating' ? 'Validating...' : machine.state === 'reserving' ? 'Processing...' : 'Redirecting...'}
                  </>
                ) : (
                  t('checkout.pay') + ' ' + formatPrice(total)
                )}
              </Button>

              {/* Machine error display with retry */}
              {(machine.state === 'failed' || machine.state === 'timeout') && machine.error && (
                <div role="alert" className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        {machine.state === 'timeout' ? 'Request Timed Out' : 'Checkout Failed'}
                      </p>
                      <p className="text-sm text-red-600 mt-1">{machine.error}</p>
                    </div>
                  </div>
                  {machine.canRetry && (
                    <Button
                      type="button"
                      onClick={handleRetry}
                      disabled={retryCooldown > 0}
                      size="sm"
                      variant="outline"
                      className="mt-3 gap-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${retryCooldown > 0 ? 'animate-spin' : ''}`} />
                      {retryCooldown > 0 ? `Retry in ${retryCooldown}s` : 'Try Again'}
                    </Button>
                  )}
                  {!machine.canRetry && (
                    <p className="text-xs text-red-400 mt-2">Max retries reached. Please refresh the page.</p>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <CardTitle className="mb-4">{t('checkout.orderSummary')}</CardTitle>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 relative shrink-0">
                      <Image
                        src={item.product.image_url?.startsWith('/') || item.product.image_url?.startsWith('http') ? item.product.image_url : '/donut.png'}
                        alt={item.product.name_en}
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name_en}</p>
                      <p className="text-sm text-gray-600">
                        {t('cart.quantity')}: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="border-t pt-4 mb-4">
                <label className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {t('checkout.promoCode')}
                </label>
                <div className="flex gap-2 mt-1">
                  {promoDiscount ? (
                    <div className="flex items-center gap-2 w-full bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 flex-1 font-medium">{promoCode}</span>
                      <button onClick={handleRemovePromo} className="text-gray-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                        placeholder={t('checkout.promoPlaceholder')}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                      >
                        {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('checkout.promoApply')}
                      </Button>
                    </>
                  )}
                </div>
                {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {promoDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('checkout.promoDiscount')}</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.tax')} (18%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>{t('cart.total')}</span>
                  <span className="text-[#FF6BBF]">{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-[#FFF8E7] rounded-3xl p-6">
            <p className="text-sm text-gray-700">
              🔒 <strong>Secure Payment:</strong> Your payment information is encrypted and secure.
              We accept all major credit cards via Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
