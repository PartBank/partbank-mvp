// 1) Repair the orphan buyeraraaf@buyer.com (confirm + metadata + profile + known pwd).
// 2) E2E-test the new admin registration path with a throwaway account, then clean up.
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

async function findByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase())
    if (u) return u
    if (data.users.length < 200) break
  }
  return null
}

// ---- 1) Repair orphan ----
const orphan = await findByEmail('buyeraraaf@buyer.com')
if (orphan) {
  await admin.auth.admin.updateUserById(orphan.id, {
    password: 'password',
    email_confirm: true,
    user_metadata: { role: 'customer', full_name: 'Buyer Araaf' },
  })
  await admin.from('profiles').upsert({ id: orphan.id, role: 'customer', full_name: 'Buyer Araaf' })
  console.log('✓ Repaired buyeraraaf@buyer.com (password: password, confirmed, profile ok)')
} else {
  console.log('• buyeraraaf@buyer.com not found (already cleaned)')
}

// ---- 2) E2E test new registration path ----
const testEmail = `regtest_${Date.now()}@example.com`
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email: testEmail,
  password: 'test1234',
  email_confirm: true,
  user_metadata: { role: 'customer', full_name: 'Reg Test' },
})
let ok = true
if (cErr || !created.user) {
  ok = false
  console.log('✗ createUser failed:', cErr?.message)
} else {
  const { error: pErr } = await admin
    .from('profiles')
    .insert({ id: created.user.id, role: 'customer', full_name: 'Reg Test' })
  const fresh = await findByEmail(testEmail)
  const { data: prof } = await admin.from('profiles').select('id').eq('id', created.user.id).maybeSingle()
  console.log(`  createUser: ok, confirmed=${!!fresh?.email_confirmed_at}`)
  console.log(`  profile insert: ${pErr ? 'FAIL ' + pErr.message : 'ok'}`)
  console.log(`  profile row present: ${!!prof}`)
  if (pErr || !fresh?.email_confirmed_at || !prof) ok = false
  // cleanup
  await admin.from('profiles').delete().eq('id', created.user.id)
  await admin.auth.admin.deleteUser(created.user.id)
  console.log('  cleaned up test account')
}
console.log(ok ? '\n✓ REGISTRATION PATH OK' : '\n✗ REGISTRATION PATH FAILED')
process.exit(ok ? 0 : 1)
