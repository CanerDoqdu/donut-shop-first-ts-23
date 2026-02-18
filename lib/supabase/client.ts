import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicEnv } from './env';

/**
 * Singleton browser Supabase client.
 * Prevents creating multiple GoTrue instances which cause
 * auth listener leaks and unnecessary network calls.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const { url, anonKey } = getSupabasePublicEnv();

  client = createBrowserClient(
    url,
    anonKey
  );

  return client;
}
