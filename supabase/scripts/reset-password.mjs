// Admin utility: reset a user's password (and confirm their email).
// Usage: node supabase/scripts/reset-password.mjs <email> <newPassword>
// Defaults: buyer@buyer.com / password
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_env.mjs'

const env = loadEnv()

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local / .env')
  process.exit(1)
}

const email = process.argv[2] ?? 'buyer@buyer.com'
const newPassword = process.argv[3] ?? 'password'

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Find the user by email (paginate through the user list)
let user = null
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) {
    console.error('listUsers error:', error.message)
    process.exit(1)
  }
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
  if (data.users.length < 200) break
}

if (!user) {
  console.error(`User not found: ${email}`)
  process.exit(1)
}

const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
  password: newPassword,
  email_confirm: true,
})

if (updErr) {
  console.error('update error:', updErr.message)
  process.exit(1)
}

console.log(`✓ Password reset for ${email} -> "${newPassword}" (email confirmed)`)
