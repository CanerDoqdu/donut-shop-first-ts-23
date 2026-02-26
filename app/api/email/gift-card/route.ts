import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { env } from '@/lib/env';
import { validateOrigin } from '@/lib/security';
import { giftCardEmailSchema, parseBody } from '@/lib/validations';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { logger, startTimer } from '@/lib/logger';
import { E_RATE_LIMITED, E_VALIDATION_FAILED, E_EMAIL_SEND_FAILED } from '@/lib/error-codes';

function getResendClient(): Resend {
  return new Resend(env.RESEND_API_KEY);
}

// HTML-escape user-supplied values to prevent injection in email bodies
function escapeHtml(value: unknown): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const POST = withHandler(async (request: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/email/gift-card' });
  const elapsed = startTimer();

  // ── CSRF: verify request origin ──
  const originError = validateOrigin(request);
  if (originError) return originError;

  // Rate limit: 3 gift card emails per minute per IP
  const ip = getClientIP(request);
  const limiter = rateLimit(`gift-card:${ip}`, { maxRequests: 3, windowSizeSeconds: 60 });
  if (!limiter.success) {
    log.warn('gift_card_email.rate_limited', { code: E_RATE_LIMITED, ip });
    log.count('gift_card_email_rate_limited');
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await request.json();

    // ── Zod validation ──
    const parsed = parseBody(giftCardEmailSchema, body);
    if (!parsed.success) {
      log.warn('gift_card_email.validation_failed', { code: E_VALIDATION_FAILED, detail: parsed.error });
      throw new ApiError(E_VALIDATION_FAILED, parsed.error, 400);
    }

    const { giftCard, locale } = parsed.data;

    // Send gift card email with Resend + timeout
    const resend = getResendClient();
    const { error } = await withTimeout(
      resend.emails.send({
        from: 'Donut Shop <onboarding@resend.dev>',
        to: giftCard.recipient_email,
        subject: locale === 'tr' ? 'Hediye Kartınız Hazır!' : 'Your Gift Card is Ready!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b, #ec4899); padding: 40px; text-align: center; border-radius: 16px;">
              <h1 style="color: white; margin: 0;">🍩 Donut Shop</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Gift Card</p>
            </div>
            
            <div style="padding: 40px; background: #f9fafb;">
              <h2 style="color: #1f2937; margin: 0 0 16px;">
                ${locale === 'tr' ? `Merhaba ${escapeHtml(giftCard.recipient_name)}!` : `Hello ${escapeHtml(giftCard.recipient_name)}!`}
              </h2>
              
              <p style="color: #4b5563;">
                ${locale === 'tr'
                  ? `${escapeHtml(giftCard.sender_name)} size bir hediye kartı gönderdi!`
                  : `${escapeHtml(giftCard.sender_name)} sent you a gift card!`
                }
              </p>
              
              <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <p style="color: #6b7280; margin: 0 0 8px;">
                  ${locale === 'tr' ? 'Hediye Kartı Kodu' : 'Gift Card Code'}
                </p>
                <p style="font-size: 24px; font-weight: bold; color: #1f2937; letter-spacing: 2px; margin: 0;">
                  ${giftCard.code}
                </p>
                <p style="font-size: 32px; font-weight: bold; color: #f59e0b; margin: 16px 0 0;">
                  ₺${giftCard.initial_balance}
                </p>
              </div>
              
              ${giftCard.message ? `
                <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin: 24px 0;">
                  <p style="color: #92400e; font-style: italic; margin: 0;">
                    "${escapeHtml(giftCard.message)}"
                  </p>
                  <p style="color: #b45309; margin: 8px 0 0; font-size: 14px;">
                    - ${escapeHtml(giftCard.sender_name)}
                  </p>
                </div>
              ` : ''}
              
              <a href="${env.NEXT_PUBLIC_SITE_URL}/checkout" 
                 style="display: inline-block; background: #f59e0b; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                ${locale === 'tr' ? 'Şimdi Kullan' : 'Use Now'}
              </a>
            </div>
            
            <div style="padding: 24px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Donut Shop. ${locale === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}</p>
            </div>
          </div>
        `,
      }),
      10_000,
      'resend.sendGiftCardEmail',
    );

    if (error) {
      log.error('gift_card_email.resend_error', { code: E_EMAIL_SEND_FAILED, error: String(error) });
      throw error;
    }

    log.info('gift_card_email.sent', { recipient: giftCard.recipient_email });
    log.metric('gift_card_email_duration_ms', elapsed());
    log.count('gift_card_email_success');

    return NextResponse.json({ success: true });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      log.error('gift_card_email.failed', { code: E_EMAIL_SEND_FAILED, error: error instanceof Error ? error.message : String(error) });
    }
    log.count('gift_card_email_error');
    log.metric('gift_card_email_duration_ms', elapsed());
    throw error instanceof ApiError
      ? error
      : new ApiError(E_EMAIL_SEND_FAILED, 'Failed to send email', 500);
  }
});
