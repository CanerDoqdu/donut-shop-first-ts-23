import { createBrowserClient } from '@supabase/ssr';

/**
 * Singleton browser Supabase client.
 * Prevents creating multiple GoTrue instances which cause
 * auth listener leaks and unnecessary network calls.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
