// Signs in (real Supabase cookie) and hits GET /api/notifications.
// Usage: node scripts/api-notif-test.mjs <email> <password>
import { readFileSync } from 'node:fs'
import { createServerClient } from '@supabase/ssr'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2]
}
const email = process.argv[2] ?? 'buyer@buyer.com'
const password = process.argv[3] ?? 'password'
const anon = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const store = new Map()
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, anon, {
  cookies: {
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => store.set(name, value)),
  },
})
const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) { console.error('sign-in failed:', error.message); process.exit(1) }
const cookie = [...store.entries()].map(([n, v]) => `${n}=${v}`).join('; ')

const res = await fetch('http://localhost:3000/api/notifications', { headers: { cookie } })
const data = await res.json()
console.log(`status:       ${res.status}`)
console.log(`unreadCount:  ${data.unreadCount}`)
console.log(`notifications:${(data.notifications ?? []).length} returned`)
if ((data.notifications ?? [])[0]) console.log(`first msg:    "${data.notifications[0].message}"`)
process.exit(res.status === 200 ? 0 : 1)
