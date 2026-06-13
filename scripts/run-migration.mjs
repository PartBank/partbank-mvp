// Apply a migration file to the remote Supabase database via Management API.
// Usage: node scripts/run-migration.mjs supabase/migrations/<filename>.sql
//
// Requires SUPABASE_ACCESS_TOKEN and supabase/.temp/project-ref (set by supabase link).

import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2]
}

const projectRef = readFileSync(
  new URL('../supabase/.temp/project-ref', import.meta.url),
  'utf8'
).trim()

const accessToken = env.SUPABASE_ACCESS_TOKEN
if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local')
  process.exit(1)
}

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node scripts/run-migration.mjs supabase/migrations/<file>.sql')
  process.exit(1)
}

const sql = readFileSync(new URL(`../${filePath}`, import.meta.url), 'utf8')

console.log(`Applying: ${filePath}`)

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const data = await res.json()

if (!res.ok) {
  console.error('Failed:', JSON.stringify(data))
  process.exit(1)
}

console.log(`✓ Done (${res.status})`)
