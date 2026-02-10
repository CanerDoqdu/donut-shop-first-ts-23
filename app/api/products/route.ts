import { NextResponse } from 'next/server';
import { sampleProducts } from '@/lib/data';

// Edge runtime for faster cold starts
export const runtime = 'edge';

// Cache for 5 minutes, revalidate in background
export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');
  const limit = searchParams.get('limit');

  let products = [...sampleProducts];

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

  return NextResponse.json(
    { products, total: products.length },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
