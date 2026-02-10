import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  pathnames: {
    '/': '/',
    '/products': {
      tr: '/urunler',
      en: '/products',
    },
    '/products/[slug]': {
      tr: '/urunler/[slug]',
      en: '/products/[slug]',
    },
    '/cart': {
      tr: '/sepet',
      en: '/cart',
    },
    '/checkout': {
      tr: '/odeme',
      en: '/checkout',
    },
    '/orders/[id]': {
      tr: '/siparisler/[id]',
      en: '/orders/[id]',
    },
    '/orders/success': {
      tr: '/siparisler/basarili',
      en: '/orders/success',
    },
    '/stores': {
      tr: '/magazalar',
      en: '/stores',
    },
    '/loyalty': {
      tr: '/sadakat',
      en: '/loyalty',
    },
    '/gift-cards': {
      tr: '/hediye-kartlari',
      en: '/gift-cards',
    },
    '/subscriptions': {
      tr: '/abonelik',
      en: '/subscriptions',
    },
    '/referrals': {
      tr: '/davetler',
      en: '/referrals',
    },
    '/admin': {
      tr: '/yonetim',
      en: '/admin',
    },
    '/admin/products': {
      tr: '/yonetim/urunler',
      en: '/admin/products',
    },
    '/admin/orders': {
      tr: '/yonetim/siparisler',
      en: '/admin/orders',
    },
    '/login': {
      tr: '/giris',
      en: '/login',
    },
    '/register': {
      tr: '/kayit',
      en: '/register',
    },
    '/forgot-password': {
      tr: '/sifremi-unuttum',
      en: '/forgot-password',
    },
    '/account': {
      tr: '/hesabim',
      en: '/account',
    },
    '/orders': {
      tr: '/siparislerim',
      en: '/orders',
    },
  },
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
