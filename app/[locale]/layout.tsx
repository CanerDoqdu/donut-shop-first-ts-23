import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter, Fredoka } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PromoBanner } from '@/components/layout/promo-banner';
import { AuthToast } from '@/components/ui/registration-toast';
import { AuthProvider } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { WebVitals } from '@/components/monitoring/web-vitals';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'tr' | 'en')) {
    notFound();
  }

  const messages = await getMessages({ locale });

  // Read auth session + profile server-side so AuthProvider starts with
  // loading=false and profile already populated — eliminates the client-side
  // Supabase round-trip that causes the navbar flash and account page skeleton.
  const supabase = await createClient();
  const { data: { user: initialUser } } = await supabase.auth.getUser();

  // Fetch profile in parallel only when a user is logged in.
  // Single extra DB read per layout render; negligible vs. the UX win.
  const initialProfile = initialUser
    ? await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', initialUser.id)
        .maybeSingle()
        .then(({ data }) => data ?? null)
    : null;

  return (
    <html lang={locale} className={`${inter.variable} ${fredoka.variable}`}>
      <body className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
            <WebVitals />
            <SpeedInsights />
            <Analytics />
            <AuthToast />
            <Header />
            <PromoBanner />
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
