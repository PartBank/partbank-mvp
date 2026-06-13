'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import type { UserRole, WorkshopTier } from '@/lib/types/database.types'

type Result = { error: string | null }

async function requireInternal(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }
  const role = user.user_metadata?.role as UserRole | undefined
  if (role !== 'internal') return { ok: false, error: 'Access denied.' }
  return { ok: true }
}

function done(id?: string) {
  revalidatePath('/internal/workshops')
  if (id) revalidatePath(`/internal/workshops/${id}`)
}

export async function approveWorkshop(id: string): Promise<Result> {
  const auth = await requireInternal()
  if (!auth.ok) return { error: auth.error }
  const admin = createAdminClient()

  const { data: ws } = await admin.from('workshops').select('profile_id').eq('id', id).single()
  if (!ws) return { error: 'Workshop not found.' }

  const { error } = await admin.from('workshops').update({ is_verified: true }).eq('id', id)
  if (error) return { error: error.message }

  await createNotification({
    userId: ws.profile_id,
    message: 'Your workshop account has been verified. You can now receive orders.',
  })
  done(id)
  return { error: null }
}

export async function rejectWorkshop(id: string, reason: string): Promise<Result> {
  const auth = await requireInternal()
  if (!auth.ok) return { error: auth.error }
  if (!reason.trim()) return { error: 'Rejection reason is required.' }
  const admin = createAdminClient()

  const { data: ws } = await admin.from('workshops').select('profile_id').eq('id', id).single()
  if (!ws) return { error: 'Workshop not found.' }

  await createNotification({
    userId: ws.profile_id,
    message: `Your workshop registration has been rejected. Reason: ${reason.trim()}. Please contact PartBank for more information.`,
  })

  const { error } = await admin.from('workshops').delete().eq('id', id)
  if (error) return { error: error.message }
  done()
  return { error: null }
}

export async function updateWorkshopTags(id: string, tags: string[]): Promise<Result> {
  const auth = await requireInternal()
  if (!auth.ok) return { error: auth.error }
  const admin = createAdminClient()
  const cleaned = tags.map((t) => t.trim()).filter(Boolean)
  const { error } = await admin.from('workshops').update({ capability_tags: cleaned }).eq('id', id)
  if (error) return { error: error.message }
  done(id)
  return { error: null }
}

export async function updateWorkshopTier(id: string, tier: WorkshopTier): Promise<Result> {
  const auth = await requireInternal()
  if (!auth.ok) return { error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.from('workshops').update({ tier }).eq('id', id)
  if (error) return { error: error.message }
  done(id)
  return { error: null }
}
