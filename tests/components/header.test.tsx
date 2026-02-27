/**
 * @vitest-environment jsdom
 */
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Hoisted mock values so the factory can reference them
const mockUseAuth = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    user: null,
    profile: null,
    loyalty: null,
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    refreshLoyalty: vi.fn(),
  })
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

vi.mock('@/lib/auth/context', () => ({
  useAuth: mockUseAuth,
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
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loyalty: null,
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshLoyalty: vi.fn(),
    });
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
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'donut@example.com',
        user_metadata: {},
      },
      profile: null,
      loyalty: null,
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshLoyalty: vi.fn(),
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    });
  });

  it('shows username derived from email when no profile name', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-2',
        email: 'glazed@example.com',
        user_metadata: {},
      },
      profile: null,
      loyalty: null,
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshLoyalty: vi.fn(),
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

  it('switches locale to TR via desktop button', async () => {
    // Stub window.location so switchLocale can write to .href
    const originalLocation = window.location;
    const locationMock = { ...originalLocation, pathname: '/en/products', search: '?q=donut', href: '' };
    Object.defineProperty(window, 'location', { value: locationMock, writable: true });

    render(<Header />);

    // The desktop language switcher renders two buttons: TR and EN
    const trButtons = screen.getAllByText('TR');
    fireEvent.click(trButtons[0]);

    expect(locationMock.href).toBe('/tr/products?q=donut');

    // Restore
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('switches locale to EN via desktop button', async () => {
    const originalLocation = window.location;
    const locationMock = { ...originalLocation, pathname: '/tr', search: '', href: '' };
    Object.defineProperty(window, 'location', { value: locationMock, writable: true });

    render(<Header />);

    const enButtons = screen.getAllByText('EN');
    fireEvent.click(enButtons[0]);

    expect(locationMock.href).toBe('/en/');

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('hides auth section while loading is true', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'donut@example.com', user_metadata: {} },
      profile: null,
      loyalty: null,
      loading: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshLoyalty: vi.fn(),
    });

    render(<Header />);

    // Even with a logged-in user, auth UI must be hidden while loading
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /user menu/i })).not.toBeInTheDocument();
      expect(screen.queryByText('nav.login')).not.toBeInTheDocument();
    });
  });

  it('switches locale via mobile menu button', async () => {
    const originalLocation = window.location;
    const locationMock = { ...originalLocation, pathname: '/en', search: '', href: '' };
    Object.defineProperty(window, 'location', { value: locationMock, writable: true });

    render(<Header />);

    // Open mobile menu
    const toggleBtn = screen.getByLabelText('Toggle menu');
    fireEvent.click(toggleBtn);

    // Mobile menu should now be visible — grab the second TR button (mobile)
    const trButtons = screen.getAllByText('TR');
    const mobileTrBtn = trButtons[trButtons.length - 1];
    fireEvent.click(mobileTrBtn);

    expect(locationMock.href).toBe('/tr/');

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('switches locale to EN via mobile menu button', async () => {
    const originalLocation = window.location;
    const locationMock = { ...originalLocation, pathname: '/tr/products', search: '', href: '' };
    Object.defineProperty(window, 'location', { value: locationMock, writable: true });

    render(<Header />);

    // Open mobile menu
    const toggleBtn = screen.getByLabelText('Toggle menu');
    fireEvent.click(toggleBtn);

    // Click the mobile EN button (last EN button in the DOM)
    const enButtons = screen.getAllByText('EN');
    const mobileEnBtn = enButtons[enButtons.length - 1];
    fireEvent.click(mobileEnBtn);

    expect(locationMock.href).toBe('/en/products');

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });
});
