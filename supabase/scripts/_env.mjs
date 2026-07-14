// Shared: load env vars from a project-root env file.
// Scripts are expected to be run from the repo root: `node supabase/scripts/<x>.mjs`.
//
//   loadEnv('lab')  → .env.lab                                 (lab project)
//   loadEnv('prod') → .env.prod (preferred) or .env            (production project)
//   loadEnv()       → .env.local (preferred), .env.prod, .env  (whatever's active)
//
// Each env file uses the SAME variable names — no prefixes.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadEnv(target) {
  const root = process.cwd()
  const candidates =
    target === 'lab'
      ? ['.env.lab']
      : target === 'prod'
        ? ['.env.prod', '.env']
        : ['.env.local', '.env.prod', '.env']
  const file = candidates.map((f) => resolve(root, f)).find((p) => existsSync(p))
  if (!file) {
    console.error(`No env file found (${candidates.join(' or ')}) at the project root.`)
    process.exit(1)
  }
  const env = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}
