import type { NextRequest } from 'next/server';

import { PROTECTED_ROUTES } from '@/lib/constants';

export function isProtectedPath(request: NextRequest): boolean {
  return PROTECTED_ROUTES.some((path) => request.nextUrl.pathname.includes(path));
}

/** Returns true when the request targets an admin-only path (e.g. /en/admin/*). */
export function isAdminPath(request: NextRequest): boolean {
  // Matches /<locale>/admin and /<locale>/admin/*
  return /^\/(tr|en)\/admin(\/|$)/.test(request.nextUrl.pathname);
}

export function detectLocaleFromPath(pathname: string): 'tr' | 'en' {
  return pathname.startsWith('/tr') ? 'tr' : 'en';
}
