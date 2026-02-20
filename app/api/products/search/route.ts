import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { withHandler } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { captureWithContext } from '@/lib/sentry';
import { E_RATE_LIMITED, E_VALIDATION_FAILED, E_DB_QUERY_FAILED } from '@/lib/error-codes';
import { sampleProducts } from '@/lib/data';

/**
 * GET /api/products/search?q=berry&limit=20&offset=0
 *
 * Full-text search endpoint.
 *
 * Strategy:
 *   1. If Supabase has the fts_search_products RPC → use Postgres FTS
 *   2. Fallback: in-memory search over sampleProducts (dev / no DB)
 *
 * Results are ranked by ts_rank (name > description, featured boosted).
 */

function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export const GET = withHandler(async (req: NextRequest, { requestId }) => {
  const log = logger.withContext({ requestId, path: '/api/products/search' });

  // Rate limit: 30 req/min per IP
  const ip = getClientIP(req);
  const limiter = rateLimit(`search:${ip}`, { maxRequests: 30, windowSizeSeconds: 60 });
  if (!limiter.success) {
    log.warn('search.rate_limited', { code: E_RATE_LIMITED, ip });
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  if (!query || query.length < 2) {
    throw new ApiError(E_VALIDATION_FAILED, 'Search query must be at least 2 characters', 400);
  }

  // Sanitize: strip special characters that could break tsquery
  const sanitized = query.replace(/[^\w\sçğıöşüÇĞİÖŞÜ-]/gi, '').slice(0, 100);

  try {
    // Try Postgres FTS first
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('fts_search_products', {
      p_query: sanitized,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;

    log.info('search.fts_success', { query: sanitized, results: data?.length ?? 0 });

    return NextResponse.json(
      { products: data ?? [], total: data?.length ?? 0, source: 'fts' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (ftsError) {
    // Fallback to in-memory search if FTS is not available
    log.warn('search.fts_fallback', {
      query: sanitized,
      error: ftsError instanceof Error ? ftsError.message : String(ftsError),
    });
    captureWithContext(ftsError, 'search', { query: sanitized, fallback: true }, 'warning');

    const lowerQuery = sanitized.toLowerCase();
    const results = sampleProducts
      .filter((p) => {
        const haystack = [p.name_en, p.name_tr, p.description_en, p.description_tr]
          .join(' ')
          .toLowerCase();
        return haystack.includes(lowerQuery);
      })
      .slice(offset, offset + limit)
      .map((p, i) => ({ ...p, rank: 1 - i * 0.01 }));

    return NextResponse.json(
      { products: results, total: results.length, source: 'memory' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  }
});
