// Create the private storage buckets used by PartBank (idempotent).
// Usage: node scripts/create-buckets.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2]
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

for (const id of ['receipts', 'drawings', 'references']) {
  const { error } = await admin.storage.createBucket(id, {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'],
  })
  if (error) {
    if (/already exists/i.test(error.message)) console.log(`• ${id} (already exists)`)
    else console.error(`✗ ${id}:`, error.message)
  } else {
    console.log(`✓ ${id} created`)
  }
}
