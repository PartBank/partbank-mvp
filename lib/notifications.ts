import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/types/database.types'

interface NotificationInput {
  userId: string
  orderId?: string
  message: string
}

// Inserts a single notification using the service-role client (bypasses RLS).
// Never throws — notification failures must not break a status transition.
export async function createNotification({
  userId,
  orderId,
  message,
}: NotificationInput): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('notifications').insert({
      user_id: userId,
      order_id: orderId ?? null,
      message,
    })
    if (error) console.error('createNotification error:', error.message)
  } catch (e) {
    console.error('createNotification threw:', e)
  }
}

// Notifies every user with the given role (used to alert all internal staff).
export async function createNotificationsForRole(
  role: UserRole,
  payload: { orderId?: string; message: string }
): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id')
      .eq('role', role)
    if (error) {
      console.error('createNotificationsForRole select error:', error.message)
      return
    }
    await Promise.all(
      (profiles ?? []).map((p) =>
        createNotification({ userId: p.id, orderId: payload.orderId, message: payload.message })
      )
    )
  } catch (e) {
    console.error('createNotificationsForRole threw:', e)
  }
}
