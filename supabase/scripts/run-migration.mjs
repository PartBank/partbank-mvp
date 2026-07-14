// Apply a migration file to the remote Supabase database via Management API.
// Usage: node supabase/scripts/run-migration.mjs supabase/migrations/<filename>.sql
//
// Reads credentials from .env.local (preferred) or .env. Needs SUPABASE_ACCESS_TOKEN
// and NEXT_PUBLIC_SUPABASE_URL. Project ref is taken from supabase/.temp/project-ref
// (set by `supabase link`) if present, otherwise derived from the URL.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from './_env.mjs'

const env = loadEnv()

// Prefer the ref written by `supabase link`; otherwise derive it from the URL.
const refFile = resolve(process.cwd(), 'supabase/.temp/project-ref')
const projectRef = existsSync(refFile)
  ? readFileSync(refFile, 'utf8').trim()
  : (env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)\./)?.[1]

if (!projectRef) {
  console.error('Could not determine project ref (no supabase/.temp/project-ref and no NEXT_PUBLIC_SUPABASE_URL).')
  process.exit(1)
}

const accessToken = env.SUPABASE_ACCESS_TOKEN
if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local / .env')
  process.exit(1)
}

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql')
  process.exit(1)
}

const sql = readFileSync(resolve(process.cwd(), filePath), 'utf8')

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
