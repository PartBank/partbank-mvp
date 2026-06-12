// Drives throwaway orders through every status transition (happy path + QC
// fail path) using the admin client, mirroring exactly what the server actions
// write. Verifies enums, FKs, and order_events all accept each step. Cleans up.
// Usage: node scripts/e2e-statemachine.mjs
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

let failures = 0
const log = (ok, msg) => {
  if (!ok) failures++
  console.log(`${ok ? '✓' : '✗ FAIL'} ${msg}`)
}

const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
const byEmail = Object.fromEntries(users.users.map((u) => [u.email, u.id]))
const buyer = byEmail['buyer@buyer.com']
const internal = byEmail['internal@partbank.com']
const { data: ws } = await admin.from('workshops').select('id').eq('is_verified', true).limit(1).single()
const { data: part } = await admin.from('parts').select('id').limit(1).single()

async function step(orderId, from, to, actor, updates = {}) {
  const u = await admin.from('orders').update({ status: to, ...updates }).eq('id', orderId)
  const e = await admin.from('order_events').insert({
    order_id: orderId, actor_id: actor, from_status: from, to_status: to, notes: `→ ${to}`,
  })
  log(!u.error && !e.error, `${from} → ${to}${u.error ? ' [order: ' + u.error.message + ']' : ''}${e.error ? ' [event: ' + e.error.message + ']' : ''}`)
}

async function newOrder() {
  const { data, error } = await admin
    .from('orders')
    .insert({ customer_id: buyer, part_id: part.id, status: 'pending_re_confirmation', notes: '[E2ETEST]' })
    .select('id')
    .single()
  if (error) { console.error('create failed:', error.message); process.exit(1) }
  await admin.from('order_events').insert({ order_id: data.id, actor_id: buyer, from_status: null, to_status: 'pending_re_confirmation', notes: 'created' })
  return data.id
}

// ---- Happy path ----
console.log('\n=== HAPPY PATH ===')
const o1 = await newOrder()
await step(o1, 'pending_re_confirmation', 'pending_re_payment', internal, { re_fee: 250000 })
await step(o1, 'pending_re_payment', 'pending_re_receipt', buyer)
await step(o1, 'pending_re_receipt', 're_in_progress', internal)
await step(o1, 're_in_progress', 'pending_part_payment', internal, { part_price: 850000 })
await step(o1, 'pending_part_payment', 'pending_payment_confirmation', buyer)
await step(o1, 'pending_payment_confirmation', 'finding_workshop', internal)
await step(o1, 'finding_workshop', 'in_production', internal, { workshop_id: ws.id })
await step(o1, 'in_production', 'pending_qc', buyer)
await step(o1, 'pending_qc', 'in_delivery', internal, { tracking_number: 'JNE-E2E-001' })
await step(o1, 'in_delivery', 'completed', internal)

// ---- QC fail path ----
console.log('\n=== QC FAIL PATH ===')
const o2 = await newOrder()
await step(o2, 'pending_re_confirmation', 'finding_workshop', internal, { re_fee: 100000, part_price: 500000 })
await step(o2, 'finding_workshop', 'in_production', internal, { workshop_id: ws.id })
await step(o2, 'in_production', 'pending_qc', buyer)
await step(o2, 'pending_qc', 'qc_failed_cancelled', internal, { qc_failure_notes: 'Toleransi tidak sesuai' })
await step(o2, 'qc_failed_cancelled', 'cancelled_refunded', internal)

// ---- Verify final states + event counts ----
console.log('\n=== VERIFY ===')
for (const [id, expected, minEvents] of [[o1, 'completed', 11], [o2, 'cancelled_refunded', 6]]) {
  const { data: ord } = await admin.from('orders').select('status').eq('id', id).single()
  const { count } = await admin.from('order_events').select('id', { count: 'exact', head: true }).eq('order_id', id)
  log(ord?.status === expected, `final status = ${ord?.status} (expected ${expected})`)
  log((count ?? 0) >= minEvents, `event count = ${count} (expected ≥ ${minEvents})`)
}

// ---- Cleanup ----
await admin.from('orders').delete().eq('id', o1)
await admin.from('orders').delete().eq('id', o2)
console.log('\nCleaned up test orders.')
console.log(failures === 0 ? '\nALL TRANSITIONS OK ✓' : `\n${failures} FAILURE(S) ✗`)
process.exit(failures === 0 ? 0 : 1)
