// Shared: load env vars from .env.local (preferred) or .env at the project root.
// Scripts are expected to be run from the repo root: `node supabase/scripts/<x>.mjs`.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadEnv() {
  const root = process.cwd()
  const file = ['.env.local', '.env'].map((f) => resolve(root, f)).find((p) => existsSync(p))
  if (!file) {
    console.error('No .env.local or .env found at the project root.')
    process.exit(1)
  }
  const env = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}
