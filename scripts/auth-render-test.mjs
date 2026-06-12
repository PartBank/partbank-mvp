// E2E render check: sign in as a real user (using Supabase's own cookie
// encoding) and fetch a protected page, asserting it renders without the
// server/client boundary error. Usage: node scripts/auth-render-test.mjs <path> <email> <password>
import { readFileSync } from 'node:fs'
import { createServerClient } from '@supabase/ssr'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2]
}

let path = process.argv[2] ?? '/catalog'
// Normalize: shells may strip/mangle a leading slash; also guard against
// Git-Bash POSIX path conversion turning "/catalog" into a Windows path.
if (!path.startsWith('/')) path = '/' + path
const lastSeg = path.split(/[\\/]/).pop()
if (path.includes(':') || path.includes('Program Files')) path = '/' + lastSeg
const email = process.argv[3] ?? 'buyer@buyer.com'
const password = process.argv[4] ?? 'password'
const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const store = new Map()
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, anonKey, {
  cookies: {
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => store.set(name, value)),
  },
})

const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  console.error('Sign-in failed:', error.message)
  process.exit(1)
}

const cookieHeader = [...store.entries()].map(([n, v]) => `${n}=${v}`).join('; ')

const res = await fetch(`http://localhost:3000${path}`, {
  headers: { cookie: cookieHeader },
  redirect: 'manual',
})
const body = await res.text()

const boundaryErr =
  body.includes('Functions cannot be passed directly to Client Components') ||
  body.includes("reading 'useContext'")
const isRedirect = res.status >= 300 && res.status < 400

console.log(`path:            ${path} (as ${email})`)
console.log(`status:          ${res.status}${isRedirect ? ' -> ' + res.headers.get('location') : ''}`)
console.log(`boundary error:  ${boundaryErr ? 'YES ❌' : 'none ✓'}`)
console.log(`sidebar present: ${body.includes('PartBank') ? 'yes ✓' : 'NO'}`)
console.log(`page heading:    ${body.includes('Katalog Part') ? '"Katalog Part" ✓' : '(not found)'}`)

process.exit(boundaryErr || isRedirect ? 1 : 0)
