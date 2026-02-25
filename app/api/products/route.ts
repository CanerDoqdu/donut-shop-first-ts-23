import { NextResponse } from 'next/server';
import { sampleProducts } from '@/lib/data';
import { cache, CACHE_TTL } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/types';

// Edge runtime for faster cold starts
export const runtime = 'edge';

// Cache for 5 minutes, revalidate in background
export const revalidate = 300;

/** Lightweight Supabase client for public reads (edge-safe, no cookies). */
function getSupabaseReadClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Try fetching products from Supabase. Returns null on any failure so the
 * caller can fall back to the hardcoded sample data.
 */
async function fetchProductsFromDB(): Promise<Product[] | null> {
  try {
    const supabase = getSupabaseReadClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return null;
    return data as Product[];
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');
  const limit = searchParams.get('limit');

  // Build cache key from query parameters
  const cacheKey = `products:${category || 'all'}:${featured || 'any'}:${limit || 'all'}`;

  // Try Redis cache first
  const cached = await cache.get<{ products: Product[]; total: number }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  // DB first, fallback to hardcoded sample data
  let products = (await fetchProductsFromDB()) ?? [...sampleProducts];

  // Filter by category
  if (category && category !== 'all') {
    products = products.filter(p => p.category === category);
  }

  // Filter featured only
  if (featured === 'true') {
    products = products.filter(p => p.featured);
  }

  // Limit results
  if (limit) {
    products = products.slice(0, parseInt(limit));
  }

  const result = { products, total: products.length };

  // Cache in Redis
  await cache.set(cacheKey, result, CACHE_TTL.PRODUCTS);

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'X-Cache': 'MISS',
    },
  });
}
