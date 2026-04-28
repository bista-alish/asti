import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // navigator.locks can deadlock when a stale lock is held by a crashed tab.
    // This is a single-tab app so cross-tab lock coordination is unnecessary.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
})
