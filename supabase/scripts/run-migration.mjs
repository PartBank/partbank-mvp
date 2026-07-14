// Apply a migration file to the remote Supabase database via Management API,
// then record it in supabase_migrations.schema_migrations — so history stays in
// sync just like `supabase db push` (see also `supabase migration repair`).
//
// Usage:
//   node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql [--env=lab|prod] [--record-only]
//
//   --env=lab|prod : which project to target (default: prod).
//                    lab  → loads .env.lab
//                    prod → loads .env.local / .env
//   --record-only  : skip running the SQL, just MARK it as applied in history.
//                    Use for migrations already applied another way (dashboard, etc).
//
// Each env file uses the same variable names. Needs SUPABASE_ACCESS_TOKEN (account-wide)
// and NEXT_PUBLIC_SUPABASE_URL; the project ref is derived from the URL.

import { readFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { loadEnv } from './_env.mjs'

const argv = process.argv.slice(2)
const recordOnly = argv.includes('--record-only')
const envArg = (argv.find((a) => a.startsWith('--env=')) || '').split('=')[1] || 'prod'
if (envArg !== 'lab' && envArg !== 'prod') {
  console.error(`Invalid --env=${envArg}. Use --env=lab or --env=prod.`)
  process.exit(1)
}

// Load the target env file (lab → .env.lab; prod → .env.local / .env).
const env = loadEnv(envArg === 'lab' ? 'lab' : undefined)

const projectRef = (env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([^.]+)\./)?.[1]
if (!projectRef) {
  console.error(`Could not determine project ref for --env=${envArg} (missing NEXT_PUBLIC_SUPABASE_URL).`)
  process.exit(1)
}

const accessToken = env.SUPABASE_ACCESS_TOKEN
if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local / .env')
  process.exit(1)
}

const filePath = argv.find((a) => !a.startsWith('--'))
if (!filePath) {
  console.error('Usage: node supabase/scripts/run-migration.mjs supabase/migrations/<file>.sql [--env=lab|prod] [--record-only]')
  process.exit(1)
}

console.log(`Target: ${envArg.toUpperCase()} (${projectRef})`)

// Derive version + name from the filename, e.g. 20260614000001_storage_buckets.sql
// -> version "20260614000001", name "storage_buckets".
const file = basename(filePath)
const version = file.split('_')[0]
const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '')
const isMigration = /^\d+$/.test(version)

if (recordOnly && !isMigration) {
  console.error(`--record-only needs a versioned filename (e.g. 20260614000001_name.sql), got: ${file}`)
  process.exit(1)
}

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return { ok: res.ok, status: res.status, data: await res.json() }
}

// 1. Apply the migration SQL (unless --record-only).
if (recordOnly) {
  console.log(`Record-only: not running SQL for ${filePath}`)
} else {
  const sql = readFileSync(resolve(process.cwd(), filePath), 'utf8')
  console.log(`Applying: ${filePath}`)
  const r = await runSql(sql)
  if (!r.ok) {
    console.error('Failed:', JSON.stringify(r.data))
    process.exit(1)
  }
  console.log(`✓ Applied (${r.status})`)
}

// 2. Record it in the migration history (idempotent). Skipped for non-migration
//    SQL files (no numeric version prefix), e.g. ad-hoc queries.
if (!isMigration) {
  console.log('(filename has no numeric version prefix — not recording in history)')
  process.exit(0)
}

const record = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key,
  statements text[],
  name text
);
insert into supabase_migrations.schema_migrations (version, name)
values ('${version}', '${name}')
on conflict (version) do nothing;`

const r2 = await runSql(record)
if (!r2.ok) {
  console.error('SQL applied, but recording history FAILED:', JSON.stringify(r2.data))
  process.exit(1)
}
console.log(`✓ Recorded in history: ${version} (${name})`)
