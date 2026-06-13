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
  part_id: string | null
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
    .select('id, status, customer_id, part_id, workshop_id, tracking_number, parts(name), workshops(profile_id)')
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
  if (!actor) return { error: 'Not authenticated.' }
  if (actor.role !== 'internal') return { error: 'Access denied.' }
  return actor
}

export async function linkOrderToPart(orderId: string, partId: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }

  // Allow linking (or re-linking to correct a mistake) up until production starts.
  const LINKABLE: OrderStatus[] = [
    'pending_re_confirmation',
    'pending_re_payment',
    'pending_re_receipt',
    're_in_progress',
    'pending_price_estimation',
    'pending_part_payment',
    'finding_workshop',
  ]
  if (!LINKABLE.includes(order.status)) return { error: 'Cannot link a part at this stage.' }

  const { error } = await admin.from('orders').update({ part_id: partId }).eq('id', orderId)
  if (error) return { error: error.message }

  revalidateOrderViews(orderId)
  return { error: null }
}

export async function confirmReFee(orderId: string, reFee: number): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }
  if (!Number.isFinite(reFee) || reFee <= 0) return { error: 'Invalid RE fee.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }

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
  if (!order) return { error: 'Order not found.' }

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

export async function submitDrawing(formData: FormData): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const orderId = String(formData.get('orderId') ?? '')
  if (!orderId) return { error: 'Invalid order.' }

  const files = formData
    .getAll('file')
    .filter((f): f is File => f instanceof File && f.size > 0)

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }

  // Require at least one drawing unless one was previously uploaded for this order.
  if (files.length === 0) {
    const { count } = await admin
      .from('files')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('file_type', 'drawing')
    if ((count ?? 0) === 0) return { error: 'At least one technical drawing is required.' }
  }

  let firstDrawingPath: string | null = null
  for (const file of files) {
    const path = `${orderId}/${Date.now()}-${file.name}`
    const { error: upErr } = await uploadFile({ bucket: 'drawings', path, file, contentType: file.type })
    if (upErr) return { error: `Failed to upload drawing: ${upErr}` }
    await admin.from('files').insert({
      order_id: orderId,
      uploader_id: actor.userId,
      file_type: 'drawing',
      storage_path: path,
    })
    if (!firstDrawingPath) firstDrawingPath = path
  }

  // Link drawing to the catalog part and mark it ready_to_make so future orders skip RE.
  if (order.part_id && firstDrawingPath) {
    await admin
      .from('parts')
      .update({ drawing_url: firstDrawingPath, status: 'ready_to_make' })
      .eq('id', order.part_id)

    // Auto-advance any other orders in RE for the same part — no need to repeat RE.
    const { data: duplicateOrders } = await admin
      .from('orders')
      .select('id, customer_id')
      .eq('part_id', order.part_id)
      .eq('status', 're_in_progress')
      .neq('id', orderId)

    for (const dup of duplicateOrders ?? []) {
      await applyTransition(admin, {
        orderId: dup.id,
        fromStatus: 're_in_progress',
        toStatus: 'finding_workshop',
        actorId: actor.userId,
        eventNotes: 'RE completed via a parallel order. Technical drawing shared from catalog.',
      })
      await createNotification({
        userId: dup.customer_id,
        orderId: dup.id,
        message: 'Reverse Engineering completed. Your order is now being assigned to a workshop.',
      })
    }
  }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'finding_workshop',
    actorId: actor.userId,
  })
  if (err) return { error: err }

  revalidateOrderViews(orderId)
  return { error: null }
}

export async function confirmPartPayment(orderId: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'in_production',
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.in_production!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function assignWorkshop(
  orderId: string,
  workshopId: string,
  price: number
): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }
  if (!workshopId) return { error: 'Please select a workshop.' }
  if (!Number.isFinite(price) || price <= 0) return { error: 'Invalid price.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'pending_part_payment',
    updates: { workshop_id: workshopId, part_price: price },
    actorId: actor.userId,
  })
  if (err) return { error: err }

  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.pending_part_payment!,
  })
  // Notify the assigned workshop.
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
  if (!trackingNumber.trim()) return { error: 'Tracking number is required.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }

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
    message: `${NOTIFICATION_MESSAGES.in_delivery!} Tracking: ${trackingNumber.trim()}`,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function qcFail(orderId: string, notes: string): Promise<ActionResult> {
  const actor = await requireInternal()
  if ('error' in actor) return { error: actor.error }
  if (!notes.trim()) return { error: 'QC failure notes are required.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }

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
      message: 'Part failed QC. Order cancelled.',
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
  if (!order) return { error: 'Order not found.' }

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
  if (!order) return { error: 'Order not found.' }

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
  if (!actor) return { error: 'Not authenticated.' }

  const orderId = String(formData.get('orderId') ?? '')
  const fileType = String(formData.get('fileType') ?? '') as 're_receipt' | 'part_receipt'
  const file = formData.get('file')
  if (!orderId) return { error: 'Invalid order.' }
  if (fileType !== 're_receipt' && fileType !== 'part_receipt') {
    return { error: 'Invalid receipt type.' }
  }
  if (!(file instanceof File) || file.size === 0) return { error: 'Please select a transfer receipt file.' }

  const admin = createAdminClient()
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }
  if (order.customer_id !== actor.userId) return { error: 'Access denied.' }

  const path = `${orderId}/${fileType}/${Date.now()}-${file.name}`
  const { error: upErr } = await uploadFile({
    bucket: 'receipts',
    path,
    file,
    contentType: file.type,
  })
  if (upErr) return { error: `Failed to upload receipt: ${upErr}` }

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
    eventNotes: 'Transfer receipt uploaded by buyer',
  })
  if (err) return { error: err }

  const label = fileType === 're_receipt' ? 'RE' : 'part payment'
  await createNotificationsForRole('internal', {
    orderId,
    message: `${label} transfer receipt received and awaiting verification.`,
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
  if (actor.role !== 'workshop') return { error: 'Access denied.' }
  const order = await loadOrder(admin, orderId)
  if (!order) return { error: 'Order not found.' }
  if (order.workshops?.profile_id !== actor.userId) return { error: 'This order does not belong to you.' }
  return order
}

export async function workshopAcceptOrder(orderId: string): Promise<ActionResult> {
  const actor = await getActor()
  if (!actor) return { error: 'Not authenticated.' }
  const admin = createAdminClient()
  const order = await requireAssignedWorkshop(admin, orderId, actor)
  if ('error' in order) return { error: order.error }

  await admin.from('order_events').insert({
    order_id: orderId,
    actor_id: actor.userId,
    from_status: order.status,
    to_status: order.status,
    notes: 'Workshop accepted the order',
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function workshopRejectOrder(orderId: string, reason: string): Promise<ActionResult> {
  const actor = await getActor()
  if (!actor) return { error: 'Not authenticated.' }
  if (!reason.trim()) return { error: 'Rejection reason is required.' }
  const admin = createAdminClient()
  const order = await requireAssignedWorkshop(admin, orderId, actor)
  if ('error' in order) return { error: order.error }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'finding_workshop',
    updates: { workshop_id: null },
    actorId: actor.userId,
    eventNotes: `Workshop rejected: ${reason.trim()}`,
  })
  if (err) return { error: err }

  await createNotificationsForRole('internal', {
    orderId,
    message: `Workshop rejected the order. Reason: ${reason.trim()}. Needs reassignment.`,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}

export async function workshopProductionComplete(orderId: string): Promise<ActionResult> {
  const actor = await getActor()
  if (!actor) return { error: 'Not authenticated.' }
  const admin = createAdminClient()
  const order = await requireAssignedWorkshop(admin, orderId, actor)
  if ('error' in order) return { error: order.error }

  const err = await applyTransition(admin, {
    orderId,
    fromStatus: order.status,
    toStatus: 'pending_qc',
    actorId: actor.userId,
    eventNotes: 'Production complete, sent to QC',
  })
  if (err) return { error: err }

  await createNotificationsForRole('internal', {
    orderId,
    message: 'Production complete. Part awaiting QC inspection.',
  })
  await createNotification({
    userId: order.customer_id,
    orderId,
    message: NOTIFICATION_MESSAGES.pending_qc!,
  })
  revalidateOrderViews(orderId)
  return { error: null }
}
