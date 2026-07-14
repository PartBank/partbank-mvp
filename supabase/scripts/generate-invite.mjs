// Generate a time-boxed demo invitation key (lab demo-account gate).
//
// Usage:
//   node supabase/scripts/generate-invite.mjs [--days=7] [--label="..."] [--env=lab|prod]
//
//   --days   : days until the key expires (default 7)
//   --label  : optional note stored with the key (e.g. who it's for)
//   --env    : which project to target (default lab). lab → .env.lab, prod → .env.prod/.env
//
// Prints the key to paste into the login page's "invitation key" box.
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_env.mjs'

const argv = process.argv.slice(2)
function getArg(name, fallback) {
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.slice(name.length + 3) : fallback
}

const envArg = getArg('env', 'lab')
if (envArg !== 'lab' && envArg !== 'prod') {
  console.error(`Invalid --env=${envArg}. Use --env=lab or --env=prod.`)
  process.exit(1)
}
const days = Number(getArg('days', '7'))
if (!Number.isFinite(days) || days <= 0) {
  console.error(`Invalid --days=${getArg('days', '7')}. Must be a positive number.`)
  process.exit(1)
}
const label = getArg('label', null)

const env = loadEnv(envArg)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Readable key: PB-XXXX-XXXX-XXXX (Crockford-ish base32, no ambiguous chars).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function group() {
  const bytes = randomBytes(4)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
const key = `PB-${group()}-${group()}-${group()}`

const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

const { error } = await admin
  .from('demo_invitations')
  .insert({ key, label, expires_at: expiresAt.toISOString() })

if (error) {
  console.error('✗ Failed to create invitation:', error.message)
  process.exit(1)
}

console.log(`Target:  ${envArg.toUpperCase()} (${env.NEXT_PUBLIC_SUPABASE_URL})`)
console.log(`Key:     ${key}`)
console.log(`Expires: ${expiresAt.toISOString()} (${days} day${days === 1 ? '' : 's'})`)
if (label) console.log(`Label:   ${label}`)
