// Sync each profile's role + full_name into the matching auth user's user_metadata.
// Login and middleware read role from user_metadata, so it must be set there.
// Usage: node scripts/sync-roles.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2]
}

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
