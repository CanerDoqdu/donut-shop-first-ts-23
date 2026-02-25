/**
 * @vitest-environment jsdom
 */
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/routing', () => ({
  Link: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}));

vi.mock('@/store/cart-store', () => ({
  useCartStore: (selector: (state: { getTotalItems: () => number }) => number) => selector({ getTotalItems: () => 0 }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })),
      })),
    })),
  }),
}));

import { Header } from '@/components/layout/header';

describe('Header', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders brand and auth links for signed-out user', async () => {
    render(<Header />);

    expect(screen.getByText('Glazed & Sipped')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('nav.login')).toBeInTheDocument();
      expect(screen.getByText('nav.register')).toBeInTheDocument();
    });
  });
});
