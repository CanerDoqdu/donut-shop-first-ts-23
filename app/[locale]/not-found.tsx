'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-4">🕳️</div>
        <h1 className="font-fredoka text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="font-fredoka text-xl font-semibold text-gray-700 mb-4">
          {t('title')}
        </h2>
        <p className="text-gray-600 mb-8">
          {t('description')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-amber-500 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
