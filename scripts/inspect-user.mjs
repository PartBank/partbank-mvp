// Diagnostic: inspect a user's auth metadata + profile row.
// Usage: node scripts/inspect-user.mjs <email>
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

const email = process.argv[2] ?? 'buyer@buyer.com'

let user = null
for (let page = 1; page <= 20 && !user; page++) {
  const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
  if (data.users.length < 200) break
}
if (!user) { console.error('User not found:', email); process.exit(1) }

console.log('--- AUTH USER ---')
console.log('id:             ', user.id)
console.log('email:          ', user.email)
console.log('email_confirmed:', !!user.email_confirmed_at)
console.log('user_metadata:  ', JSON.stringify(user.user_metadata))

const { data: profile, error } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
console.log('--- PROFILE ROW ---')
console.log(error ? 'error: ' + error.message : JSON.stringify(profile))

const { count, error: brandErr } = await admin.from('truck_brands').select('*', { count: 'exact', head: true })
console.log('--- truck_brands count ---')
console.log(brandErr ? 'error: ' + brandErr.message : count)
