'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification, createNotificationsForRole } from '@/lib/notifications'
import { uploadFile } from '@/lib/supabase/storage'
import { NOTIFICATION_MESSAGES, WORKSHOP_ASSIGNED_MESSAGE } from '@/lib/types/order'
import type { OrderStatus, UserRole } from '@/lib/types/database.types'

type ActionResult = { error: string | null }

interface Actor {
  userId: string
  role: UserRole | null
}

async function getActor(): Promise<Actor | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, role: (user.user_metadata?.role as UserRole) ?? null }
}

type OrderContext = {
  id: string
  status: OrderStatus
  customer_id: string
  workshop_id: string | null
  tracking_number: string | null
  parts: { name: string } | null
  workshops: { profile_id: string } | null
}

async function loadOrder(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string
): Promise<OrderContext | null> {
  const { data } = await admin
    .from('orders')
    .select('id, status, customer_id, workshop_id, tracking_number, parts(name), workshops(profile_id)')
    .eq('id', orderId)
    .single()
  // Supabase types to-one relations as arrays in some versions; normalize.
  if (!data) return null
  const parts = Array.isArray(data.parts) ? data.parts[0] ?? null : data.parts
  const workshops = Array.isArray(data.workshops) ? data.workshops[0] ?? null : data.workshops
  return { ...data, parts, workshops } as OrderContext
}

function revalidateOrderViews(orderId: string) {
  for (const p of [
    `/orders/${orderId}`,
    '/orders',
    `/internal/orders/${orderId}`,
    '/internal/orders',
    '/internal/dashboard',
    `/workshop/orders/${orderId}`,
    '/workshop/orders',
    '/workshop/dashboard',
  ]) {
    revalidatePath(p)
  }
}

interface TransitionArgs {
  orderId: string
  fromStatus: OrderStatus
  toStatus: OrderStatus
  updates?: Record<string, unknown>
  actorId: string
  eventNotes?: string
}

async function applyTransition(
  admin: ReturnType<typeof createAdminClient>,
  { orderId, fromStatus, toStatus, updates, actorId, eventNotes }: TransitionArgs
): Promise<string | null> {
  const { error } = await admin
    .from('orders')
    .update({ status: toStatus, ...(updates ?? {}) })
    .eq('id', orderId)
  if (error) return error.message
  await admin.from('order_events').insert({
    order_id: orderId,
    actor_id: actorId,
    from_status: fromStatus,
    to_status: toStatus,
    notes: eventNotes ?? null,
  })
  return null
}

// ============================================================
// INTERNAL actions
// ============================================================

async function requireInternal(): Promise<Actor | { error: string }> {
  const actor = await getActor()
  if (!actor) return { error: 'Tidak terautentikasi.' }
  if (actor.role !== 'internal') return { error: 'Akses ditolak.' }
  return actor
}

export async function confirmReFee(orderId: string, reFee: number): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }
  if (!Number.isFinite(reFee) || reFee <= 0) return { error: 'Biaya RE tidak valid.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'pending_re_payment',
    updates: { re_fee: reFee },
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.pending_re_payment!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function confirmReReceipt(orderId: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 're_in_progress',
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.re_in_progress!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function submitDrawingAndPrice(formData: FormData): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const orderId = String(formData.get('orderId') ?? '')
  const partPrice = Number(formData.get('partPrice'))
  const leadTime = String(formData.get('leadTime') ?? '').trim()
  const file = formData.get('file')
  if (!orderId) return { error: 'Order tidak valid.' }
  if (!Number.isFinite(partPrice) || partPrice <= 0) return { error: 'Estimasi harga tidak valid.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  // Upload the drawing if provided.
  if (file instanceof File && file.size > 0) {
    const path = `${orderId}/${Date.now()}-${file.name}`
    const { error: upErr } = await uploadFile({
      bucket: 'drawings',
      path,
      file,
      contentType: file.type,
    })
    if (upErr) return { error: `Gagal upload gambar: ${upErr}` }
    await admin.from('files').insert({
      order_id: orderId,
      uploader_id: actor.userId,
      file_type: 'drawing',
      storage_path: path,
    })
  }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'pending_part_payment',
    updates: { part_price: partPrice },
    actorId: actor.userId,
    eventNotes: leadTime ? `Estimasi waktu: ${leadTime}` : undefined,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.pending_part_payment!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function confirmPartPayment(orderId: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'finding_workshop',
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: 'Pembayaran part dikonfirmasi. PartBank sedang mencari bengkel.',
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function assignWorkshop(orderId: string, workshopId: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }
  if (!workshopId) return { error: 'Pilih bengkel terlebih dahulu.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'in_production',
    updates: { workshop_id: workshopId },
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.in_production!,
  })
  // Notify the assigned workshop's owner.
  const { data: ws } = await admin
    .from('workshops')
    .select('profile_id')
    .eq('id', workshopId)
    .single()
  if (ws) {
    await createNotification({ userId: ws.profile_id, orderId, message: WORKSHOP_ASSIGNED_MESSAGE })
  }
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function qcPass(orderId: string, trackingNumber: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }
  if (!trackingNumber.trim()) return { error: 'Nomor resi wajib diisi.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'in_delivery',
    updates: { tracking_number: trackingNumber.trim() },
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: `${NOTIFICATION_MESSAGES.in_delivery!} Resi: ${trackingNumber.trim()}`,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function qcFail(orderId: string, notes: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }
  if (!notes.trim()) return { error: 'Catatan kegagalan wajib diisi.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'qc_failed_cancelled',
    updates: { qc_failure_notes: notes.trim() },
    actorId: actor.userId,
    eventNotes: notes.trim(),
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.qc_failed_cancelled!,
  })
  if (order.workshops?.profile_id) {
    await createNotification({
      userId: order.workshops.profile_id,
      orderId,
      message: 'Part gagal QC. Order dibatalkan.',
    })
  }
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function markRefunded(orderId: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'cancelled_refunded',
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.cancelled_refunded!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function markCompleted(orderId: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'completed',
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.completed!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

// ============================================================
// CUSTOMER actions
// ============================================================

export async function uploadReceipt(formData: FormData): Promise<ActionResult> {
  const actor = await getActor()
  if (!actor) return { error: 'Tidak terautentikasi.' }

  const orderId = String(formData.get('orderId') ?? '')
  const fileType = String(formData.get('fileType') ?? '') as 're_receipt' | 'part_receipt'
  const file = formData.get('file')
  if (!orderId) return { error: 'Order tidak valid.' }
  if (fileType !== 're_receipt' && fileType !== 'part_receipt') {
    return { error: 'Tipe bukti tidak valid.' }
  }
  if (!(file instanceof File) || file.size === 0) return { error: 'Pilih file bukti transfer.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }
  if (order.customer_id !== actor.userId) return { error: 'Akses ditolak.' }

  const path = `${orderId}/${fileType}/${Date.now()}-${file.name}`
  const { error: upErr } = await uploadFile({
    bucket: 'receipts',
    path,
    file,
    contentType: file.type,
  })
  if (upErr) return { error: `Gagal upload bukti: ${upErr}` }

  await admin.from('files').insert({
    order_id: orderId,
    uploader_id: actor.userId,
    file_type: fileType,
    storage_path: path,
  })

  const toStatus: OrderStatus =
    fileType === 're_receipt' ? 'pending_re_receipt' : 'pending_payment_confirmation'

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus,
    actorId: actor.userId,
    eventNotes: 'Bukti transfer diupload oleh customer',
  })
  if (err) return { error: err }

  const label = fileType === 're_receipt' ? 'RE' : 'pembayaran part'
  await createNotificationsForRole('internal', {
    orderId,
    message: `Bukti transfer ${label} diterima dan menunggu verifikasi.`,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

// ============================================================
// WORKSHOP actions
// ============================================================

async function requireAssignedWorkshop(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  actor: Actor
): Promise<OrderContext | { error: string }> {
  if (actor.role !== 'workshop') return { error: 'Akses ditolak.' }
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order tidak ditemukan.' }
  if (order.workshops?.profile_id !== actor.userId) return { error: 'Order ini bukan milik Anda.' }
  return order
}

export async function workshopAcceptOrder(orderId: string): Promise<ActionResult> {
  const actor = await getActor()
  if (!actor) return { error: 'Tidak terautentikasi.' }
  const admin = createAdminClient()
  const order = await requireAssignedWorkshop(admin, orderId, actor)
  if ('error' in order) return { error: order.error }

  await admin.from('order_events').insert({
    order_id: orderId,
    actor_id: actor.userId,
    from_status: order.status,
    to_status: order.status,
    notes: 'Workshop menerima pesanan',
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function workshopRejectOrder(orderId: string, reason: string): Promise<ActionResult> {
  const actor = await getActor()
  if (!actor) return { error: 'Tidak terautentikasi.' }
  if (!reason.trim()) return { error: 'Alasan penolakan wajib diisi.' }
  const admin = createAdminClient()
  const order = await requireAssignedWorkshop(admin, orderId, actor)
  if ('error' in order) return { error: order.error }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'finding_workshop',
    updates: { workshop_id: null },
    actorId: actor.userId,
    eventNotes: `Workshop menolak: ${reason.trim()}`,
  })
  if (err) return { error: err }

  await createNotificationsForRole('internal', {
    orderId,
    message: `Bengkel menolak pesanan. Alasan: ${reason.trim()}. Perlu penugasan ulang.`,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function workshopProductionComplete(orderId: string): Promise<ActionResult> {
  const actor = await getActor()
  if (!actor) return { error: 'Tidak terautentikasi.' }
  const admin = createAdminClient()
  const order = await requireAssignedWorkshop(admin, orderId, actor)
  if ('error' in order) return { error: order.error }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'pending_qc',
    actorId: actor.userId,
    eventNotes: 'Produksi selesai, dikirim ke QC',
  })
  if (err) return { error: err }

  await createNotificationsForRole('internal', {
    orderId,
    message: 'Produksi selesai. Part menunggu inspeksi QC.',
  })
  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.pending_qc!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}
