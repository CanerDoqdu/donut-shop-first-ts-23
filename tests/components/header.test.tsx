/**
 * @vitest-environment jsdom
 */
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Hoisted so the mock factory can reference the same fn instance
const mockGetUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { user: null } })
);

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
  Link: (props: { href: string; children: React.ReactNode; locale?: string }) =>
    <a href={props.href}>{props.children}</a>,
}));

vi.mock('@/store/cart-store', () => ({
  useCartStore: (selector: (state: { getTotalItems: () => number }) => number) =>
    selector({ getTotalItems: () => 0 }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
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

// Also mock ui components that may not be fully available in jsdom
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...rest }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) =>
    asChild ? <>{children}</> : <button {...rest as React.ButtonHTMLAttributes<HTMLButtonElement>}>{children}</button>,
}));

import { Header } from '@/components/layout/header';

describe('Header', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
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

  it('renders user menu button when signed in', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: 'donut@example.com',
          user_metadata: {},
        },
      },
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    });
  });

  it('shows username derived from email when no profile name', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-2',
          email: 'glazed@example.com',
          user_metadata: {},
        },
      },
    });

    render(<Header />);

    await waitFor(() => {
      // profile.full_name is null → falls back to email prefix
      expect(screen.getByText('glazed')).toBeInTheDocument();
    });
  });

  it('renders nav links always visible', () => {
    render(<Header />);
    expect(screen.getByText('nav.home')).toBeInTheDocument();
    expect(screen.getByText('nav.products')).toBeInTheDocument();
  });
});
