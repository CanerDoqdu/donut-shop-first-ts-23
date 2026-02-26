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
 * SERVER-ONLY — never import this from client components.
 */
export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const map = new Map<string, Product>();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids);
    if (!error && data && data.length > 0) {
      for (const p of data as Product[]) {
        map.set(p.id, p);
      }
      return map;
    }
  } catch {
    // Fallback to sample data
  }
  for (const p of sampleProducts) {
    if (ids.includes(p.id)) map.set(p.id, p);
  }
  return map;
}
