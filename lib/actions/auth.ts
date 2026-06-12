'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/types/database.types'

interface RegisterInput {
  email: string
  password: string
  role: UserRole
  fullName: string
  workshopName?: string
}

// Creates a user via the admin API with email already confirmed (no
// confirmation email, no rate-limit wait), then provisions the profile and,
// for workshops, the workshop row — all via the service-role client.
export async function registerUser(input: RegisterInput): Promise<{ error: string | null }> {
  const email = input.email.trim().toLowerCase()
  const { password, role, fullName } = input

  if (!email) return { error: 'Email is required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (!fullName.trim()) return { error: 'Full name is required.' }
  if (role !== 'customer' && role !== 'workshop') return { error: 'Invalid account type.' }
  if (role === 'workshop' && !input.workshopName?.trim())
    return { error: 'Workshop name is required.' }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullName.trim() },
  })

  if (error || !data.user) {
    const msg = error?.message ?? ''
    if (/already|registered|exists/i.test(msg)) {
      return { error: 'This email is already registered. Try signing in instead.' }
    }
    return { error: msg || 'Could not create account.' }
  }

  const userId = data.user.id

  const { error: profileErr } = await admin
    .from('profiles')
    .insert({ id: userId, role, full_name: fullName.trim() })
  if (profileErr) {
    // Roll back the auth user so the email can be reused cleanly.
    await admin.auth.admin.deleteUser(userId)
    return { error: 'Could not create profile. Please try again.' }
  }

  if (role === 'workshop') {
    await admin
      .from('workshops')
      .insert({ profile_id: userId, name: input.workshopName!.trim(), is_verified: false })
  }

  return { error: null }
}
