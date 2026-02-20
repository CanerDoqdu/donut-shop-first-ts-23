'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home, AlertTriangle, WifiOff, ShieldX, ServerCrash } from 'lucide-react';

/* ── Error categorisation ────────────────────────────────── */
type ErrorCategory = 'network' | 'auth' | 'server' | 'unknown';

function categorise(error: Error): ErrorCategory {
  const msg = error.message?.toLowerCase() ?? '';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('aborterror'))
    return 'network';
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('401') || msg.includes('403'))
    return 'auth';
  if (msg.includes('500') || msg.includes('server') || msg.includes('internal'))
    return 'server';
  return 'unknown';
}

const categoryMeta: Record<ErrorCategory, { icon: React.ReactNode; emoji: string; title: string; description: string }> = {
  network: {
    icon: <WifiOff className="w-8 h-8 text-amber-500" />,
    emoji: '📡',
    title: 'Connection Lost',
    description: 'It looks like you\'re offline or our servers can\'t be reached. Check your internet connection and try again.',
  },
  auth: {
    icon: <ShieldX className="w-8 h-8 text-red-500" />,
    emoji: '🔒',
    title: 'Access Denied',
    description: 'Your session may have expired or you don\'t have permission. Please sign in again.',
  },
  server: {
    icon: <ServerCrash className="w-8 h-8 text-orange-500" />,
    emoji: '🔧',
    title: 'Server Hiccup',
    description: 'Our servers are having a moment. We\'re on it — please try again shortly.',
  },
  unknown: {
    icon: <AlertTriangle className="w-8 h-8 text-pink-500" />,
    emoji: '🍩',
    title: 'Oops! Something went wrong',
    description: 'We dropped a donut. Don\'t worry, we\'re picking it up!',
  },
};

const RETRY_COOLDOWN_SEC = 5;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [cooldown, setCooldown] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const category = categorise(error);
  const meta = categoryMeta[category];

  useEffect(() => {
    console.error('[ErrorBoundary]', { category, digest: error.digest, message: error.message });
  }, [error, category]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    setCooldown(RETRY_COOLDOWN_SEC);
    reset();
  }, [reset]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center shadow-inner">
            <span className="text-5xl">{meta.emoji}</span>
          </div>
        </div>

        {/* Title & description */}
        <h2 className="font-fredoka text-2xl font-bold text-gray-900 mb-2">
          {meta.title}
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          {meta.description}
        </p>

        {/* Error digest (for support) */}
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono select-all bg-gray-50 rounded-lg py-2 px-3 inline-block">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Button
            onClick={handleRetry}
            size="lg"
            disabled={cooldown > 0}
            className="min-w-40"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${cooldown > 0 ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Retry in ${cooldown}s` : 'Try Again'}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Link>
          </Button>
        </div>

        {/* Retry hint */}
        {retryCount >= 2 && (
          <p className="text-xs text-gray-400 mt-4">
            Still not working? Try refreshing the page or{' '}
            <Link href="/" className="underline hover:text-gray-600">
              go back home
            </Link>.
          </p>
        )}
      </div>
    </div>
  );
}
