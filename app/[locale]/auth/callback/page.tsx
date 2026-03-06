import { redirect } from 'next/navigation';

// The main PKCE callback is handled by /api/auth/callback.
// This page is a server-side fallback that redirects immediately —
// no client JS, no layout shift.
export default async function AuthCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const code = typeof sp.code === 'string' ? sp.code : undefined;

  if (code) {
    redirect(`/api/auth/callback?code=${encodeURIComponent(code)}&locale=${locale}`);
  }

  redirect(`/${locale}`);
}
