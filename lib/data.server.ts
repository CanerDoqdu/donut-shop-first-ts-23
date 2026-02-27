import 'server-only';

import type { Product } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { sampleProducts } from '@/lib/data';

/**
 * Fetch a single product by ID.
 * Tries Supabase first, falls back to sample data.
 * SERVER-ONLY — never import this from client components.
 */
export async function getProductById(id: string): Promise<Product | undefined> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) return data as Product;
  } catch {
    // DB unreachable — use fallback
  }
  return sampleProducts.find(p => p.id === id);
}

/**
 * Fetch multiple products by IDs.
 * Tries Supabase first, falls back to sample data.
 * Returns both the product map and the set of IDs that exist in the DB
 * (so callers can avoid inserting FK references for sample-only products).
 * SERVER-ONLY — never import this from client components.
 */
export async function getProductsByIds(ids: string[]): Promise<{ map: Map<string, Product>; dbIds: Set<string> }> {
  const map = new Map<string, Product>();
  const dbIds = new Set<string>();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids);
    if (!error && data && data.length > 0) {
      for (const p of data as Product[]) {
        map.set(p.id, p);
        dbIds.add(p.id);
      }
    }
  } catch {
    // Fallback to sample data
  }
  // Fill in any missing products from sample data
  for (const id of ids) {
    if (!map.has(id)) {
      const sample = sampleProducts.find(p => p.id === id);
      if (sample) map.set(sample.id, sample);
    }
  }
  return { map, dbIds };
}
