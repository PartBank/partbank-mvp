// Demo/lab seed data for PartBank — creates the workshop + buyer demo accounts
// and a sample catalog. Self-contained and idempotent. Run AFTER all migrations,
// and AFTER the internal-account seed (20260613080000) so parts are attributed to it.
//
// Usage: node supabase/seed/20260613083000_demo_data.mjs [--force]
//
// SAFETY: refuses to run when NEXT_PUBLIC_APP_ENV=production (pass --force to override).
// This is lab-only data — do not run it against a real production database.
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../scripts/_env.mjs'

const env = loadEnv()
const force = process.argv.includes('--force')

if (env.NEXT_PUBLIC_APP_ENV === 'production' && !force) {
  console.error('Refusing to seed: NEXT_PUBLIC_APP_ENV=production. This is lab-only data.')
  console.error('If you really mean it, re-run with --force.')
  process.exit(1)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase())
    if (u) return u
    if (data.users.length < 200) break
  }
  return null
}

// ---- Demo accounts (workshop + buyer; internal is created by its own seed) ----
const ACCOUNTS = [
  { email: 'workshop@bengkel.com', role: 'workshop', full_name: 'Bengkel Maju Jaya' },
  { email: 'buyer@buyer.com',      role: 'customer', full_name: 'Pak Budi Santoso' },
]

const ids = {}
for (const acc of ACCOUNTS) {
  let user = await findUserByEmail(acc.email)
  if (user) {
    console.log(`• ${acc.email} already exists`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: 'password',
      email_confirm: true,
      user_metadata: { role: acc.role, full_name: acc.full_name },
    })
    if (error || !data.user) {
      console.error(`✗ createUser ${acc.email}:`, error?.message)
      process.exit(1)
    }
    user = data.user
    console.log(`✓ created ${acc.email} (password: password)`)
  }
  ids[acc.email] = user.id
  await admin.from('profiles').upsert({ id: user.id, role: acc.role, full_name: acc.full_name })
}

const workshopUid = ids['workshop@bengkel.com']

// Attribute parts to the internal account if it exists (run its seed first).
const internalUser = await findUserByEmail('internal@partbank.asia')
const internalId = internalUser?.id ?? null
if (!internalId) {
  console.log('• internal account not found — parts.created_by will be null')
  console.log('  (run supabase/seed/20260613080000_internal_account.mjs first for attribution)')
}

// Workshop row (idempotent on profile_id).
const { data: existingWs } = await admin.from('workshops').select('id').eq('profile_id', workshopUid).limit(1)
if (!existingWs || existingWs.length === 0) {
  await admin.from('workshops').insert({
    profile_id: workshopUid,
    name: 'Bengkel Maju Jaya',
    capability_tags: ['machining', 'welding', 'casting'],
    is_verified: true,
  })
  console.log('✓ workshop row created')
} else {
  console.log('• workshop row already exists')
}

// ---- Catalog -------------------------------------------------------------
// Guard: skip the whole catalog if any brands already exist.
const { count: brandCount } = await admin.from('truck_brands').select('*', { count: 'exact', head: true })
if (brandCount && brandCount > 0) {
  console.log(`• catalog already seeded (${brandCount} brands) — skipping`)
  console.log('Done.')
  process.exit(0)
}

// Brands
const brandNames = ['Hino', 'Mitsubishi Fuso', 'Isuzu']
const { data: brands } = await admin.from('truck_brands').insert(brandNames.map((name) => ({ name }))).select('id, name')
const brandId = Object.fromEntries(brands.map((b) => [b.name, b.id]))

// Models
const modelRows = [
  { brand: 'Hino',            name: 'FM 260 JD',   year_range: '2015–2023' },
  { brand: 'Hino',            name: 'Ranger FG',   year_range: '2012–2022' },
  { brand: 'Mitsubishi Fuso', name: 'FN 527 ML',   year_range: '2016–2023' },
  { brand: 'Mitsubishi Fuso', name: 'FJ 2523',     year_range: '2013–2021' },
  { brand: 'Isuzu',           name: 'ELF NMR 71',  year_range: '2014–2023' },
  { brand: 'Isuzu',           name: 'Giga FVZ 34', year_range: '2017–2023' },
]
const { data: models } = await admin
  .from('truck_models')
  .insert(modelRows.map((m) => ({ brand_id: brandId[m.brand], name: m.name, year_range: m.year_range })))
  .select('id, name')
const modelId = Object.fromEntries(models.map((m) => [m.name, m.id]))

// Global categories
const categoryNames = ['Sistem Kemudi', 'Sistem Rem', 'Sistem Suspensi', 'Sistem Transmisi', 'Sistem Pendingin', 'Sistem Bahan Bakar']
const { data: cats } = await admin.from('part_categories').insert(categoryNames.map((name) => ({ name }))).select('id, name')
const catId = Object.fromEntries(cats.map((c) => [c.name, c.id]))

// Parts: [category, model, name, description, grade]
const parts = [
  // Hino FM 260 JD
  ['Sistem Kemudi',      'FM 260 JD',   'Tie Rod End Kiri',       'Tie rod end sisi kiri untuk Hino FM 260', 'B'],
  ['Sistem Kemudi',      'FM 260 JD',   'Rack Steering',          'Rack kemudi Hino FM 260 JD', 'A'],
  ['Sistem Kemudi',      'FM 260 JD',   'King Pin Set',           'Set king pin lengkap dengan bushing', 'B'],
  ['Sistem Rem',         'FM 260 JD',   'Kampas Rem Depan',       'Brake pad depan Hino FM 260', 'A'],
  ['Sistem Rem',         'FM 260 JD',   'Master Silinder Rem',    'Master cylinder rem hidrolik', 'B'],
  // Hino Ranger FG
  ['Sistem Suspensi',    'Ranger FG',   'Shackle Pegas Belakang', 'Shackle daun pegas belakang Ranger FG', 'B'],
  ['Sistem Suspensi',    'Ranger FG',   'Bos Pegas Depan',        'Bushing pegas daun depan', 'C'],
  ['Sistem Transmisi',   'Ranger FG',   'Gardan Belakang',        'Differential rear axle Ranger FG', 'A'],
  ['Sistem Transmisi',   'Ranger FG',   'Cross Joint Propeller',  'Universal joint propeller shaft', 'B'],
  // Fuso FN 527 ML
  ['Sistem Kemudi',      'FN 527 ML',   'Drag Link',              'Drag link kemudi Fuso FN 527', 'B'],
  ['Sistem Kemudi',      'FN 527 ML',   'Idler Arm',              'Idler arm steering Fuso FN', 'C'],
  ['Sistem Pendingin',   'FN 527 ML',   'Pompa Air',              'Water pump Fuso FN 527 ML', 'A'],
  ['Sistem Pendingin',   'FN 527 ML',   'Tutup Radiator',         'Radiator cap pressure valve', 'A'],
  // Fuso FJ 2523
  ['Sistem Rem',         'FJ 2523',     'Booster Rem',            'Brake booster assembly Fuso FJ', 'B'],
  ['Sistem Rem',         'FJ 2523',     'Caliper Rem Depan',      'Brake caliper depan FJ 2523', 'A'],
  ['Sistem Bahan Bakar', 'FJ 2523',     'Filter Solar',           'Fuel filter diesel Fuso FJ', 'A'],
  ['Sistem Bahan Bakar', 'FJ 2523',     'Pompa Injeksi',          'Injection pump FJ 2523', 'B'],
  // Isuzu ELF NMR 71
  ['Sistem Kemudi',      'ELF NMR 71',  'Tie Rod End',            'Tie rod end Isuzu ELF NMR 71', 'B'],
  ['Sistem Kemudi',      'ELF NMR 71',  'Ball Joint Bawah',       'Lower ball joint ELF NMR', 'B'],
  ['Sistem Rem',         'ELF NMR 71',  'Kampas Rem Tromol',      'Brake shoe tromol belakang ELF', 'A'],
  ['Sistem Rem',         'ELF NMR 71',  'Wheel Cylinder Belakang','Wheel cylinder rem tromol', 'B'],
  // Isuzu Giga FVZ 34
  ['Sistem Transmisi',   'Giga FVZ 34', 'Kopling Utama',          'Clutch disc assembly Giga FVZ', 'A'],
  ['Sistem Transmisi',   'Giga FVZ 34', 'Plat Penekan Kopling',   'Pressure plate clutch Giga FVZ', 'B'],
  ['Sistem Suspensi',    'Giga FVZ 34', 'Shock Absorber Depan',   'Front shock absorber Isuzu Giga', 'A'],
  ['Sistem Suspensi',    'Giga FVZ 34', 'Baut U-Bolt Belakang',   'U-bolt pegas belakang Giga FVZ', 'B'],
]
const { error: partsErr } = await admin.from('parts').insert(
  parts.map(([cat, model, name, description, grade]) => ({
    category_id: catId[cat],
    model_id: modelId[model],
    name,
    description,
    manufacturability_grade: grade,
    status: 'request_only',
    created_by: internalId,
  }))
)
if (partsErr) {
  console.error('✗ parts insert:', partsErr.message)
  process.exit(1)
}

console.log(`✓ catalog seeded: ${brandNames.length} brands, ${modelRows.length} models, ${categoryNames.length} categories, ${parts.length} parts`)
console.log('Done.')
