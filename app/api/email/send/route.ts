import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { env } from '@/lib/env';
import { validateOrigin } from '@/lib/security';
import { emailSendSchema, parseBody } from '@/lib/validations';

function getResendClient() {
  return new Resend(env.RESEND_API_KEY);
}

const emailTemplates = {
  order_confirmation: {
    tr: {
      subject: 'Siparişiniz Alındı! 🍩',
    },
    en: {
      subject: 'Order Confirmed! 🍩',
    },
  },
  order_shipped: {
    tr: {
      subject: 'Siparişiniz Yola Çıktı! 🚚',
    },
    en: {
      subject: 'Your Order is on the Way! 🚚',
    },
  },
  order_delivered: {
    tr: {
      subject: 'Siparişiniz Teslim Edildi! ✅',
    },
    en: {
      subject: 'Order Delivered! ✅',
    },
  },
  subscription_reminder: {
    tr: {
      subject: 'Abonelik Teslimatınız Yaklaşıyor 📦',
    },
    en: {
      subject: 'Subscription Delivery Coming Up 📦',
    },
  },
  loyalty_points_earned: {
    tr: {
      subject: 'Puan Kazandınız! ⭐',
    },
    en: {
      subject: 'You Earned Points! ⭐',
    },
  },
  referral_success: {
    tr: {
      subject: 'Davetiniz Başarılı! 🎉',
    },
    en: {
      subject: 'Referral Successful! 🎉',
    },
  },
};

export async function POST(request: NextRequest) {
  // ── CSRF: verify request origin ──
  const originError = validateOrigin(request);
  if (originError) return originError;

  // Rate limit: 3 emails per minute per IP
  const ip = getClientIP(request);
  const limiter = rateLimit(`email:${ip}`, { maxRequests: 3, windowSizeSeconds: 60 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const body = await request.json();

    // ── Zod validation ──
    const parsed = parseBody(emailSendSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { type, to, data, locale } = parsed.data;
    const resend = getResendClient();

    const template = emailTemplates[type][locale as 'tr' | 'en'];

    // Send email with Resend
    const { error } = await resend.emails.send({
      from: 'Donut Shop <onboarding@resend.dev>',
      to,
      subject: template.subject,
      html: generateEmailHtml(type, data, locale),
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

// Helper function - will be used when Resend is configured
function generateEmailHtml(type: string, data: Record<string, unknown>, locale: string) {
  const baseTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #f59e0b; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0;">🍩 Donut Shop</h1>
      </div>
      <div style="padding: 32px;">
        {{CONTENT}}
      </div>
      <div style="padding: 24px; text-align: center; background: #f9fafb; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Donut Shop</p>
      </div>
    </div>
  `;

  let content = '';

  switch (type) {
    case 'order_confirmation':
      content = locale === 'tr'
        ? `<h2>Siparişiniz Alındı!</h2><p>Sipariş numaranız: <strong>${data.orderId}</strong></p><p>Toplam: <strong>₺${data.total}</strong></p>`
        : `<h2>Order Confirmed!</h2><p>Your order number: <strong>${data.orderId}</strong></p><p>Total: <strong>₺${data.total}</strong></p>`;
      break;
    case 'order_shipped':
      content = locale === 'tr'
        ? `<h2>Siparişiniz Yola Çıktı!</h2><p>Sipariş numarası: <strong>${data.orderId}</strong></p>`
        : `<h2>Your Order is on the Way!</h2><p>Order number: <strong>${data.orderId}</strong></p>`;
      break;
    case 'loyalty_points_earned':
      content = locale === 'tr'
        ? `<h2>Tebrikler!</h2><p><strong>${data.points}</strong> puan kazandınız.</p><p>Toplam puanınız: <strong>${data.totalPoints}</strong></p>`
        : `<h2>Congratulations!</h2><p>You earned <strong>${data.points}</strong> points.</p><p>Total points: <strong>${data.totalPoints}</strong></p>`;
      break;
    default:
      content = '<p>Thank you for using Donut Shop!</p>';
  }

  return baseTemplate.replace('{{CONTENT}}', content);
}
