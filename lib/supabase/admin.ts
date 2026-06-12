import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// Service-role client — bypasses RLS. Use ONLY in server-side code
// (Server Actions, API routes) and never expose to the browser.
// Order status transitions, order_events, and notifications all require
// this because RLS restricts those writes to the 'internal' role, while
// legitimate transitions are also triggered by customers and workshops.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
