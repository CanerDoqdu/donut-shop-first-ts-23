'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, X, Mail, PartyPopper } from 'lucide-react';

type Variant = 'confirmed' | 'needs-confirmation';

const CFG: Record<Variant, {
  Icon: typeof PartyPopper;
  iconCls: string;
  iconBg: string;
  border: string;
  title: string;
  subtitle: string;
  SubIcon: typeof Mail | null;
}> = {
  confirmed: {
    Icon: PartyPopper,
    iconCls: 'text-amber-600',
    iconBg: 'bg-amber-100',
    border: 'border-amber-200',
    title: 'Welcome to Glazed & Sipped!',
    subtitle: 'Your account is ready. Start exploring our delicious donuts!',
    SubIcon: null,
  },
  'needs-confirmation': {
    Icon: CheckCircle,
    iconCls: 'text-green-600',
    iconBg: 'bg-green-100',
    border: 'border-green-200',
    title: 'Account created successfully!',
    subtitle: 'Please check your email and click the confirmation link to activate your account.',
    SubIcon: Mail,
  },
};

/**
 * Helper: Read auth-toast cookie, consume it, and return variant.
 * Called once during component initialization.
 */
function getAuthToastVariant(): Variant | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)auth-toast=([^;]*)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1]) as Variant;
  if (v !== 'confirmed' && v !== 'needs-confirmation') return null;
  // Consume cookie immediately
  document.cookie = 'auth-toast=; path=/; max-age=0';
  console.log('[AuthToast] initialized with variant:', v);
  return v;
}

/**
 * Post-registration toast. Reads the `auth-toast` cookie set by the
 * server action, shows a styled notification, and auto-dismisses.
 */
export function AuthToast() {
  // Read cookie only once during component initialization
  const initialVariant = getAuthToastVariant();
  const [variant, setVariant] = useState<Variant | null>(initialVariant);
  const [visible, setVisible] = useState(!!initialVariant);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!variant) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setVariant(null), 300);
    }, 8000);
    return () => clearTimeout(t);
  }, [variant]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setVariant(null), 300);
  };

  if (!variant) return null;

  const c = CFG[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 w-[min(90vw,440px)]
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-5 scale-95 pointer-events-none'}`}
    >
      <div className={`bg-white border ${c.border} rounded-2xl shadow-xl px-5 py-4 flex items-start gap-4`}>
        <div className={`shrink-0 mt-0.5 ${c.iconBg} rounded-full p-2`}>
          <c.Icon className={`w-5 h-5 ${c.iconCls}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
            {c.SubIcon && <c.SubIcon className="w-4 h-4 shrink-0" />}
            {c.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
