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

  const partId = String(formData.get('partId') ?? '').trim() || null
  const customPartName = String(formData.get('customPartName') ?? '').trim() || null
  const customPartDescription = String(formData.get('customPartDescription') ?? '').trim() || null
  const truckInfo = String(formData.get('truckInfo') ?? '').trim() || null
  const quantity = Math.max(1, Number(formData.get('quantity') ?? 1))
  const notes = String(formData.get('notes') ?? '').trim() || null
  const photos = formData.getAll('photo')

  // One of partId or customPartName is required
  if (!partId && !customPartName) return { error: 'Pilih part dari katalog atau isi nama part.' }
  if (!partId && !truckInfo) return { error: 'Info truk wajib diisi untuk request part baru.' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  let partName: string
  if (partId) {
    const { data: part } = await admin.from('parts').select('id, name').eq('id', partId).single()
    if (!part) return { error: 'Part tidak ditemukan.' }
    partName = part.name
  } else {
    partName = customPartName!
  }

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      customer_id: user.id,
      part_id: partId,
      custom_part_name: customPartName,
      custom_part_description: customPartDescription,
      truck_info: truckInfo,
      quantity,
      notes,
      status: 'pending_re_confirmation',
    })
    .select('id')
    .single()
  if (orderErr || !order) return { error: orderErr?.message ?? 'Gagal membuat pesanan.' }

  for (const photo of photos) {
    if (!(photo instanceof File) || photo.size === 0) continue
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

  await admin.from('order_events').insert({
    order_id: order.id,
    actor_id: user.id,
    from_status: null,
    to_status: 'pending_re_confirmation',
    notes: partId ? 'Order dibuat dari katalog' : 'Order custom — part belum ada di katalog',
  })

  const notifSuffix = partId ? '' : ' (part baru, belum di katalog)'
  await createNotificationsForRole('internal', {
    orderId: order.id,
    message: `Order baru dari ${profile?.full_name ?? 'customer'} untuk ${partName}${notifSuffix}.`,
  })

  revalidatePath('/orders')
  revalidatePath('/internal/orders')
  revalidatePath('/internal/dashboard')
  redirect(`/orders/${order.id}`)
}
