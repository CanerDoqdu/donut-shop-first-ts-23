'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { safeFetch } from '@/lib/safe-fetch';
import { generateIdempotencyKey, getOrCreateIdempotencyKey, rotateIdempotencyKey } from '@/lib/idempotency';

export default function CheckoutPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { items, getTotalPrice } = useCartStore();
  const machine = useCheckoutMachine();
  const idempotencyKeyRef = useRef<string>(getOrCreateIdempotencyKey());
  const retryButtonRef = useRef<HTMLButtonElement>(null);
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
      if (!res.ok) throw new Error(data.error || t('checkout.invalidPromo'));
      setPromoDiscount({ discountValue: data.discountValue, discountType: data.discountType });
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : t('checkout.invalidPromo'));
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

  // Stripe return/back can restore page from bfcache with stale in-memory state.
  // If restored while busy, reset to idle so submit button is usable again.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (machine.isBusy) {
        machine.reset();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [machine]);

  // Bug #5: Move focus to retry button on failure for a11y
  useEffect(() => {
    if ((machine.state === 'failed' || machine.state === 'timeout') && machine.canRetry) {
      // Wait a tick for the button to render, then focus
      const id = requestAnimationFrame(() => {
        retryButtonRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [machine.state, machine.canRetry]);

  const handleRetry = useCallback(() => {
    if (!machine.canRetry) return;
    const cooldownMs = getRetryCooldownMs(machine.retryCount);
    setRetryCooldown(Math.ceil(cooldownMs / 1000));
    // Rotate idempotency key: previous attempt may have created a stale order.
    // Fresh key ensures the server treats this as a new checkout, not a duplicate.
    idempotencyKeyRef.current = rotateIdempotencyKey();
    machine.send({ type: 'RETRY' });
  }, [machine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset machine if it was stuck in a terminal state, then start
    if (machine.state === 'failed' || machine.state === 'timeout') {
      machine.reset();
    }
    machine.send({ type: 'START_CHECKOUT' });

    // Validate form
    const payload = {
      items: items.map((item) => ({
        id: item.product.id,
        quantity: item.quantity,
      })),
      customerEmail: formData.email,
      customerName: formData.name,
      customerPhone: formData.phone,
      customerAddress: formData.address,
      locale,
      idempotencyKey: idempotencyKeyRef.current,
      ...(promoDiscount ? { promoCode: promoCode.trim() } : {}),
    };

    const valid = validateAll(payload);

    if (!valid) {
      machine.send({ type: 'VALIDATION_FAIL', error: 'Form validation failed' });
      return;
    }

    machine.send({ type: 'VALIDATION_OK' });

    try {
      // Call checkout API with safeFetch (timeout + retry + abort)
      const result = await safeFetch<{ url: string; orderId: string }>('/api/checkout', {
        method: 'POST',
        timeout: CHECKOUT_TIMEOUT_MS,
        retries: 0, // Checkout is NOT idempotent without key — no auto-retry
        source: 'checkout',
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
          idempotencyKey: idempotencyKeyRef.current,
          ...(promoDiscount ? { promoCode: promoCode.trim() } : {}),
        }),
      });

      if (!result.ok || !result.data?.url) {
        if (result.error === 'Request timed out') {
          machine.send({ type: 'TIMEOUT' });
        } else if (result.status === 404) {
          // Product not found — cart has stale IDs (pre-migration data).
          // Clear cart so the user can re-add from fresh product listings.
          useCartStore.getState().clearCart();
          machine.send({
            type: 'RESERVATION_FAIL',
            error: t('checkout.cartExpiredStale'),
          });
        } else {
          machine.send({
            type: 'RESERVATION_FAIL',
            error: result.error || t('checkout.failedSession'),
          });
        }
        return;
      }

      // Success — rotate idempotency key for next checkout
      idempotencyKeyRef.current = generateIdempotencyKey();

      // Transition to redirecting and hand off to Stripe
      machine.send({ type: 'RESERVATION_OK', url: result.data.url });
      window.location.href = result.data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('checkout.paymentFailed');
      machine.send({ type: 'RESERVATION_FAIL', error: message });
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
                  placeholder={t('checkout.namePlaceholder')}
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
                  placeholder={t('checkout.addressPlaceholder')}
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
                  {t.rich('checkout.termsLabel', {
                    terms: (chunks) => <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">{chunks}</span>,
                    privacy: (chunks) => <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">{chunks}</span>,
                    returns: (chunks) => <span className="text-[#FF6BBF] underline hover:text-[#FF3DA0]">{chunks}</span>,
                  })}
                </label>
              </div>

              <Button type="submit" className="w-full mt-6" size="lg" disabled={machine.isBusy || !termsAccepted}>
                {machine.isBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {machine.state === 'validating' ? t('checkout.stateValidating') : machine.state === 'reserving' ? t('checkout.stateProcessing') : t('checkout.stateRedirecting')}
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
                        {machine.state === 'timeout' ? t('checkout.requestTimeout') : t('checkout.checkoutFailed')}
                      </p>
                      <p className="text-sm text-red-600 mt-1">{machine.error}</p>
                    </div>
                  </div>
                  {machine.canRetry && (
                    <Button
                      ref={retryButtonRef}
                      type="button"
                      onClick={handleRetry}
                      disabled={retryCooldown > 0}
                      size="sm"
                      variant="outline"
                      className="mt-3 gap-2"
                      data-focus-trap-disabled
                    >
                      <RefreshCw className={`h-3 w-3 ${retryCooldown > 0 ? 'animate-spin' : ''}`} />
                      {retryCooldown > 0 ? t('checkout.retryIn', { seconds: retryCooldown }) : t('checkout.tryAgain')}
                    </Button>
                  )}
                  {!machine.canRetry && (
                    <p className="text-xs text-red-400 mt-2">{t('checkout.maxRetries')}</p>
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
                        alt={locale === 'tr' ? item.product.name_tr : item.product.name_en}
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{locale === 'tr' ? item.product.name_tr : item.product.name_en}</p>
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
              {t.rich('checkout.securePayment', {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
