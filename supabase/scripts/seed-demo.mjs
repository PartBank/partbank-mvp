// Seed a demo-ready state: one in-production order with history + a few
// unread notifications per account. Idempotent (skips if a [DEMO] order exists).
// Usage: node supabase/scripts/seed-demo.mjs
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_env.mjs'

const env = loadEnv()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Resolve the demo accounts.
const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
const byEmail = Object.fromEntries(users.users.map((u) => [u.email, u.id]))
const buyerId = byEmail['buyer@buyer.com']
const internalId = byEmail['internal@partbank.com']
if (!buyerId || !internalId) {
  console.error('Demo accounts missing.')
  process.exit(1)
}

const { data: workshop } = await admin
  .from('workshops')
  .select('id, profile_id')
  .eq('is_verified', true)
  .limit(1)
  .single()
if (!workshop) {
  console.error('No verified workshop found.')
  process.exit(1)
}

const { data: part } = await admin.from('parts').select('id, name').limit(1).single()

// Idempotency guard.
const { data: existing } = await admin.from('orders').select('id').ilike('notes', '%[DEMO]%').limit(1)
if (existing && existing.length > 0) {
  console.log('Demo order already exists — skipping order seed.')
} else {
  const { data: order, error } = await admin
    .from('orders')
    .insert({
      customer_id: buyerId,
      part_id: part.id,
      workshop_id: workshop.id,
      status: 'in_production',
      quantity: 1,
      notes: '[DEMO] Order contoh untuk demo — produksi sedang berjalan.',
      re_fee: 250000,
      part_price: 850000,
    })
    .select('id')
    .single()
  if (error) {
    console.error('Order insert error:', error.message)
    process.exit(1)
  }

  const journey = [
    { from: null, to: 'pending_re_confirmation', actor: buyerId, notes: 'Order dibuat oleh customer' },
    { from: 'pending_re_confirmation', to: 'pending_re_payment', actor: internalId, notes: 'Biaya RE: Rp 250.000' },
    { from: 'pending_re_payment', to: 're_in_progress', actor: internalId, notes: 'Pembayaran RE dikonfirmasi' },
    { from: 're_in_progress', to: 'pending_part_payment', actor: internalId, notes: 'Estimasi harga part dikirim' },
    { from: 'pending_part_payment', to: 'finding_workshop', actor: internalId, notes: 'Pembayaran part dikonfirmasi' },
    { from: 'finding_workshop', to: 'in_production', actor: internalId, notes: 'Bengkel ditugaskan' },
  ]
  for (const e of journey) {
    await admin.from('order_events').insert({
      order_id: order.id,
      actor_id: e.actor,
      from_status: e.from,
      to_status: e.to,
      notes: e.notes,
    })
  }
  console.log(`✓ Demo order created: ${order.id}`)
}

// A couple of unread notifications per account so the bell has content.
const notifs = [
  { user_id: buyerId, message: 'Selamat datang di PartBank! Mulai dari katalog untuk memesan part.' },
  { user_id: buyerId, message: 'Pesanan demo Anda sedang dalam produksi oleh bengkel.' },
  { user_id: internalId, message: 'Ada order yang sedang dalam produksi.' },
  { user_id: internalId, message: 'Selamat datang, Admin PartBank.' },
  { user_id: workshop.profile_id, message: 'Anda mendapat pesanan baru dari PartBank.' },
  { user_id: workshop.profile_id, message: 'Selamat datang, mitra bengkel PartBank.' },
]
const { error: nErr } = await admin.from('notifications').insert(notifs)
if (nErr) console.error('Notif insert error:', nErr.message)
else console.log(`✓ ${notifs.length} notifications seeded`)
console.log('Done.')
