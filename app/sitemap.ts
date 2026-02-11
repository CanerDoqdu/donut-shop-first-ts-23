import type { MetadataRoute } from 'next';
import { sampleProducts } from '@/lib/data';

const BASE_URL = 'https://glazedandsipped.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['en', 'tr'];

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

  // Static pages for each locale
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1 : 0.8,
      });
    }
  }

  // Product pages
  for (const locale of locales) {
    for (const product of sampleProducts) {
      entries.push({
        url: `${BASE_URL}/${locale}/products/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
