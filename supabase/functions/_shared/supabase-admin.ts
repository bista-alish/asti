import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Creates a Supabase client with the service role key.
 * Used inside Edge Functions to bypass RLS when needed.
 */
export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}
