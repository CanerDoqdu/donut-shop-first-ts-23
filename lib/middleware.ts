import type { NextRequest } from 'next/server';

import { PROTECTED_ROUTES } from '@/lib/constants';

export function isProtectedPath(request: NextRequest): boolean {
  return PROTECTED_ROUTES.some((path) => request.nextUrl.pathname.includes(path));
}

export function detectLocaleFromPath(pathname: string): 'tr' | 'en' {
  return pathname.startsWith('/tr') ? 'tr' : 'en';
}
