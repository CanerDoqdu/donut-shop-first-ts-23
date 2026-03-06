import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter, Fredoka } from 'next/font/google';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { PromoBanner } from '@/components/layout/promo-banner';
import { AuthToast } from '@/components/ui/registration-toast';
import { AuthProvider } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { ClientMonitoring } from '@/components/monitoring/client-monitoring';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'optional',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '700'],
  display: 'optional',
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
  const monitoringEnabled = process.env.NEXT_PUBLIC_DISABLE_MONITORING !== '1';

  // Avoid unnecessary auth DB/network work for anonymous requests.
  const cookieStore = await cookies();
  const hasSupabaseAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));

  let initialUser: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] = null;
  let initialProfile: { id: string; email: string | null; full_name: string | null } | null = null;

  if (hasSupabaseAuthCookie) {
    // Read auth session + profile server-side so AuthProvider starts with
    // loading=false and profile already populated.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    initialUser = user;

    if (initialUser) {
      initialProfile = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', initialUser.id)
        .maybeSingle()
        .then(({ data }) => data ?? null);
    }
  }

  return (
    <html lang={locale} className={`${inter.variable} ${fredoka.variable}`}>
      <head>
        <link rel="preconnect" href="https://o4510924639174656.ingest.de.sentry.io" />
      </head>
      <body className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
            {monitoringEnabled && <ClientMonitoring />}
            <AuthToast />
            <Header />
            <PromoBanner />
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
            <Analytics />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
