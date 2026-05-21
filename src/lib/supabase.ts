/**
 * Server-side Supabase client for API routes.
 * Uses the service role key — never expose this to the browser.
 *
 * If credentials are not configured (or @supabase/supabase-js is not installed)
 * getSupabaseClient() returns null and callers must gracefully degrade.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSupabaseClient(): Promise<any | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  if (_client) return _client;

  // Dynamic import — resolves even if @supabase/supabase-js is not installed.
  try {
    // Using require() via eval to avoid static analysis errors when package is absent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { createClient } = require("@supabase/supabase-js") as any;

    _client = createClient(url, key, {
      auth: { persistSession: false },
    });
    return _client;
  } catch {
    // Package not installed — degrade gracefully.
    return null;
  }
}

/** True only when Supabase env vars are configured and the package is available. */
export async function isSupabaseAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  return client !== null;
}
