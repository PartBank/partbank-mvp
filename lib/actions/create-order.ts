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
  if (!user) return { error: 'Not authenticated.' }
  const role = user.user_metadata?.role as UserRole | undefined
  if (role !== 'customer') return { error: 'Only customers can place orders.' }

  const partId = String(formData.get('partId') ?? '').trim() || null
  const customPartName = String(formData.get('customPartName') ?? '').trim() || null
  const customPartDescription = String(formData.get('customPartDescription') ?? '').trim() || null
  const truckInfo = String(formData.get('truckInfo') ?? '').trim() || null
  const quantity = Math.max(1, Number(formData.get('quantity') ?? 1))
  const notes = String(formData.get('notes') ?? '').trim() || null
  const photos = formData.getAll('photo')

  // One of partId or customPartName is required
  if (!partId && !customPartName) return { error: 'Select a part from the catalog or enter a part name.' }
  if (!partId && !truckInfo) return { error: 'Truck information is required for a custom part request.' }

  // File limits
  const MAX_FILES = 5
  const MAX_SIZE_BYTES = 5 * 1024 * 1024
  const validPhotos = photos.filter((p): p is File => p instanceof File && p.size > 0)
  if (validPhotos.length > MAX_FILES) return { error: `Maximum ${MAX_FILES} files allowed.` }
  const oversized = validPhotos.find((f) => f.size > MAX_SIZE_BYTES)
  if (oversized) return { error: `File "${oversized.name}" exceeds the 5MB limit.` }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  let partName: string
  let isKnownPart = false
  if (partId) {
    const { data: part } = await admin.from('parts').select('id, name, drawing_url').eq('id', partId).single()
    if (!part) return { error: 'Part not found.' }
    partName = part.name
    isKnownPart = !!part.drawing_url
  } else {
    partName = customPartName!
  }

  const initialStatus = isKnownPart ? 'finding_workshop' : 'pending_re_confirmation'

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
      status: initialStatus,
    })
    .select('id')
    .single()
  if (orderErr || !order) return { error: orderErr?.message ?? 'Failed to create order.' }

  for (const photo of validPhotos) {
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
    to_status: initialStatus,
    notes: isKnownPart
      ? 'Known part — RE skipped, pending workshop assignment'
      : partId
        ? 'Order created from catalog'
        : 'Custom order — part not in catalog',
  })

  const notifSuffix = partId ? (isKnownPart ? '' : '') : ' (new part, not in catalog)'
  await createNotificationsForRole('internal', {
    orderId: order.id,
    message: `New order from ${profile?.full_name ?? 'buyer'} for ${partName}${notifSuffix}.`,
  })

  revalidatePath('/orders')
  revalidatePath('/internal/orders')
  revalidatePath('/internal/dashboard')
  redirect(`/orders/${order.id}`)
}
