import type { MetadataRoute } from 'next';
import { sampleProducts } from '@/lib/data';

const BASE_URL = 'https://glazedandsipped.com';
const LOCALES = ['en', 'tr'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/products',
    '/stores',
    '/gift-cards',
    '/loyalty',
    '/subscriptions',
    '/referrals',
    '/login',
    '/register',
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Static pages — one entry per locale with hreflang alternates
  for (const locale of LOCALES) {
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, `${BASE_URL}/${l}${page}`]),
          ),
        },
      });
    }
  }

  // Product pages — one entry per locale with hreflang alternates
  for (const locale of LOCALES) {
    for (const product of sampleProducts) {
      entries.push({
        url: `${BASE_URL}/${locale}/products/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, `${BASE_URL}/${l}/products/${product.slug}`]),
          ),
        },
      });
    }
  }

  return entries;
}
