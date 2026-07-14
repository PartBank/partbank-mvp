// Create the internal (admin) account. Environment-agnostic — run this in ANY
// environment (lab or production) to bootstrap the admin login. Idempotent:
// if the account already exists, its password is left untouched.
//
// Usage: node supabase/seed/20260613080000_internal_account.mjs --pass=<password>
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../scripts/_env.mjs'

const env = loadEnv()

// Parse --pass=<value> or --pass <value>
function getArg(name) {
  const argv = process.argv.slice(2)
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.slice(name.length + 3)
  const i = argv.indexOf(`--${name}`)
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1]
  return undefined
}

const password = getArg('pass')
if (!password) {
  console.error('Missing --pass. Usage: node supabase/seed/20260613080000_internal_account.mjs --pass=<password>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const EMAIL = 'internal@partbank.asia'
const FULL_NAME = 'Admin PartBank'

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase())
    if (u) return u
    if (data.users.length < 200) break
  }
  return null
}

let user = await findUserByEmail(EMAIL)
if (user) {
  console.log(`• ${EMAIL} already exists — password left unchanged.`)
  console.log('  (use supabase/scripts/reset-password.mjs to change it)')
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password,
    email_confirm: true,
    user_metadata: { role: 'internal', full_name: FULL_NAME },
  })
  if (error || !data.user) {
    console.error('✗ createUser:', error?.message)
    process.exit(1)
  }
  user = data.user
  console.log(`✓ created ${EMAIL}`)
}

const { error: pErr } = await admin
  .from('profiles')
  .upsert({ id: user.id, role: 'internal', full_name: FULL_NAME })
if (pErr) {
  console.error('✗ profile upsert:', pErr.message)
  process.exit(1)
}
console.log('✓ profile ensured (role=internal)')
console.log('Done.')
