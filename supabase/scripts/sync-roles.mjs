// Sync each profile's role + full_name into the matching auth user's user_metadata.
// Login and middleware read role from user_metadata, so it must be set there.
// Usage: node supabase/scripts/sync-roles.mjs
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_env.mjs'

const env = loadEnv()

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: profiles, error } = await admin.from('profiles').select('id, role, full_name')
if (error) { console.error('profiles error:', error.message); process.exit(1) }

for (const p of profiles) {
  const { data, error: updErr } = await admin.auth.admin.updateUserById(p.id, {
    user_metadata: { role: p.role, full_name: p.full_name },
  })
  if (updErr) {
    console.error(`✗ ${p.id} (${p.role}):`, updErr.message)
  } else {
    console.log(`✓ ${data.user.email} -> role=${p.role}`)
  }
}
