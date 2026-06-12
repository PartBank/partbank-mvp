'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotificationsForRole } from '@/lib/notifications'
import { uploadFile } from '@/lib/supabase/storage'
import type { UserRole } from '@/lib/types/database.types'

export async function createOrder(
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }
  const role = user.user_metadata?.role as UserRole | undefined
  if (role !== 'customer') return { error: 'Hanya customer yang dapat membuat pesanan.' }

  const partId = String(formData.get('partId') ?? '')
  const quantity = Math.max(1, Number(formData.get('quantity') ?? 1))
  const notes = String(formData.get('notes') ?? '').trim()
  const photo = formData.get('photo')
  if (!partId) return { error: 'Part tidak valid.' }

  const admin = createAdminClient()

  // Verify part exists + grab its name + the customer's name for the notification.
  const [{ data: part }, { data: profile }] = await Promise.all([
    admin.from('parts').select('id, name').eq('id', partId).single(),
    admin.from('profiles').select('full_name').eq('id', user.id).single(),
  ])
  if (!part) return { error: 'Part tidak ditemukan.' }

  // Insert the order.
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      customer_id: user.id,
      part_id: partId,
      quantity,
      notes: notes || null,
      status: 'pending_re_confirmation',
    })
    .select('id')
    .single()
  if (orderErr || !order) return { error: orderErr?.message ?? 'Gagal membuat pesanan.' }

  // Optional reference photo.
  if (photo instanceof File && photo.size > 0) {
    const path = `${order.id}/${Date.now()}-${photo.name}`
    const { error: upErr } = await uploadFile({
      bucket: 'references',
      path,
      file: photo,
      contentType: photo.type,
    })
    if (!upErr) {
      await admin.from('files').insert({
        order_id: order.id,
        uploader_id: user.id,
        file_type: 'reference_photo',
        storage_path: path,
      })
    }
  }

  // Initial event + notify internal staff.
  await admin.from('order_events').insert({
    order_id: order.id,
    actor_id: user.id,
    from_status: null,
    to_status: 'pending_re_confirmation',
    notes: 'Order dibuat oleh customer',
  })
  await createNotificationsForRole('internal', {
    orderId: order.id,
    message: `Order baru masuk dari ${profile?.full_name ?? 'customer'} untuk ${part.name}.`,
  })

  revalidatePath('/orders')
  revalidatePath('/internal/orders')
  revalidatePath('/internal/dashboard')
  redirect(`/orders/${order.id}`)
}
