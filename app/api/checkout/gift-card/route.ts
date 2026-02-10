import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';

export async function POST(req: NextRequest) {
  try {
    const { 
      amount, 
      senderName, 
      senderEmail, 
      recipientName, 
      recipientEmail, 
      message,
      locale = 'en' 
    } = await req.json();

    if (!amount || !senderName || !senderEmail || !recipientName || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount < 10 || amount > 5000) {
      return NextResponse.json(
        { error: 'Amount must be between 10 and 5000' },
        { status: 400 }
      );
    }

    // Generate unique gift card code for metadata
    const code = `GC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'try',
            product_data: {
              name: locale === 'tr' ? 'Hediye Kartı' : 'Gift Card',
              description: locale === 'tr' 
                ? `${senderName}'den ${recipientName}'a hediye` 
                : `Gift from ${senderName} to ${recipientName}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to kuruş
          },
          quantity: 1,
        },
      ],
      customer_email: senderEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}&code=${code}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/gift-cards?cancelled=true`,
      metadata: {
        type: 'gift_card',
        code,
        amount: amount.toString(),
        senderName,
        senderEmail,
        recipientName,
        recipientEmail,
        message: message || '',
      },
    });

    return NextResponse.json({ url: session.url, code });
  } catch (err) {
    console.error('Gift card checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
