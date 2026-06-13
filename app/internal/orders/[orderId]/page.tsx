import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl, type StorageBucket } from '@/lib/supabase/storage'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatusTimeline } from '@/components/shared/StatusTimeline'
import { OrderActionPanel } from '@/components/internal/OrderActionPanel'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import type { OrderStatus } from '@/lib/utils/status'
import type { FileType } from '@/lib/types/database.types'

export const metadata: Metadata = { title: 'PartBank — Order (Internal)' }

const FILE_TYPE_LABELS: Record<FileType, string> = {
  re_receipt: 'RE Transfer Receipt',
  part_receipt: 'Part Transfer Receipt',
  drawing: 'Technical Drawing',
  reference_photo: 'Reference Photo',
}

function bucketFor(fileType: FileType): StorageBucket {
  if (fileType === 'drawing') return 'drawings'
  if (fileType === 'reference_photo') return 'references'
  return 'receipts'
}

interface Props {
  params: { orderId: string }
}

export default async function InternalOrderDetailPage({ params }: Props) {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(
      `id, status, quantity, notes, re_fee, part_price, tracking_number, qc_failure_notes,
       custom_part_name, custom_part_description, truck_info, created_at, part_id,
       parts(id, name, manufacturability_grade, price_reference, drawing_url, part_categories(name)),
       customer:profiles!orders_customer_id_fkey(full_name),
       workshops(name)`
    )
    .eq('id', params.orderId)
    .single()

  if (!order) notFound()

  const orderPartId = (order as { part_id?: string | null }).part_id ?? null

  const [
    { data: events },
    { data: files },
    { data: verifiedWorkshops },
    { data: rawParts },
    { data: rawModels },
    { data: rawBrands },
    { data: duplicateReOrders },
  ] = await Promise.all([
    supabase
      .from('order_events')
      .select('id, to_status, notes, created_at')
      .eq('order_id', params.orderId)
      .order('created_at', { ascending: true }),
    supabase
      .from('files')
      .select('id, file_type, storage_path, created_at')
      .eq('order_id', params.orderId)
      .order('created_at', { ascending: true }),
    supabase.from('workshops').select('id, name, capability_tags').eq('is_verified', true),
    supabase.from('parts').select('id, name, model_id').order('name'),
    supabase.from('truck_models').select('id, name, brand_id'),
    supabase.from('truck_brands').select('id, name'),
    orderPartId && order.status === 're_in_progress'
      ? supabase.from('orders').select('id').eq('part_id', orderPartId).eq('status', 're_in_progress').neq('id', params.orderId)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  // Generate signed URLs server-side.
  const filesWithUrls = await Promise.all(
    (files ?? []).map(async (f) => {
      const { url } = await getSignedUrl({
        bucket: bucketFor(f.file_type as FileType),
        path: f.storage_path,
      })
      return { ...f, url }
    })
  )

  const status = order.status as OrderStatus
  const part = Array.isArray(order.parts) ? order.parts[0] : order.parts
  const partLinked = part !== null
  const linkedPartName = part?.name ?? null
  const priceReference = (part as { price_reference?: number | null } | null)?.price_reference ?? null
  const partHasDrawing = !!((part as { drawing_url?: string | null } | null)?.drawing_url)

  const brandName = new Map((rawBrands ?? []).map((b) => [b.id, b.name]))
  const modelLabel = new Map(
    (rawModels ?? []).map((m) => [m.id, `${brandName.get(m.brand_id) ?? '?'} ${m.name}`])
  )
  const catalogParts = (rawParts ?? []).map((p) => ({
    id: p.id,
    label: `${modelLabel.get(p.model_id) ?? '?'} — ${p.name}`,
  }))
  const category = part
    ? Array.isArray(part.part_categories)
      ? part.part_categories[0]
      : part.part_categories
    : null
  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
  const workshop = Array.isArray(order.workshops) ? order.workshops[0] : order.workshops
  const existingDrawingCount = (filesWithUrls).filter((f) => f.file_type === 'drawing').length
  const duplicateReOrderCount = (duplicateReOrders ?? []).length

  return (
    <div className="px-8 pt-7 pb-10">
      <PageHeader title={`Order ${shortId(order.id)}`} subtitle={part?.name ?? order.custom_part_name ?? 'Custom Part Request'} />
      <div>
        <Link href="/internal/orders" className="text-sm text-navy-700 hover:underline mb-6 inline-block">
          ← Back to All Orders
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-border p-5 space-y-3">
              <p className="font-mono text-xs text-text-muted">{shortId(order.id)}</p>
              <p className="text-base font-semibold text-text-primary">{part?.name}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-text-muted">Customer</span>
                  <p className="text-text-primary">{customer?.full_name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-text-muted">Workshop</span>
                  <p className="text-text-primary">{workshop?.name ?? 'Not assigned'}</p>
                </div>
                <div>
                  <span className="text-text-muted">Qty</span>
                  <p className="text-text-primary">{order.quantity} unit</p>
                </div>
                <div>
                  <span className="text-text-muted">Date</span>
                  <p className="text-text-primary">{formatDateTime(order.created_at)}</p>
                </div>
                {order.re_fee != null && (
                  <div>
                    <span className="text-text-muted">RE Fee</span>
                    <p className="text-text-primary">{formatCurrency(order.re_fee)}</p>
                  </div>
                )}
                {order.part_price != null && (
                  <div>
                    <span className="text-text-muted">Part Price</span>
                    <p className="text-text-primary">{formatCurrency(order.part_price)}</p>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="text-sm pt-1">
                  <span className="text-text-muted">Buyer notes</span>
                  <p className="text-text-primary">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Buyer's original request — shown for custom-origin orders */}
            {order.custom_part_name && (
              <div className="border-l-2 border-amber-400 bg-amber-50 rounded-r-md px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                    Original Request
                  </span>
                  <span className={`text-[11px] font-medium ${partLinked ? 'text-green-600' : 'text-amber-600'}`}>
                    {partLinked ? '✓ Linked to catalog' : '○ Not yet linked'}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary">{order.custom_part_name}</p>
                {order.truck_info && (
                  <p className="text-xs text-text-secondary">{order.truck_info}</p>
                )}
                {order.custom_part_description && (
                  <p className="text-xs text-text-secondary whitespace-pre-wrap">{order.custom_part_description}</p>
                )}
              </div>
            )}

            {/* Files */}
            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-3">Attached Files</p>
              {filesWithUrls.length === 0 ? (
                <p className="text-sm text-text-muted">No files attached.</p>
              ) : (
                <ul className="space-y-2">
                  {filesWithUrls.map((f) => (
                    <li key={f.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-text-secondary">
                        <FileText className="h-4 w-4 text-text-muted" />
                        {FILE_TYPE_LABELS[f.file_type as FileType]}
                        <span className="text-text-muted">· {formatDateTime(f.created_at)}</span>
                      </span>
                      {f.url ? (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy-700 hover:underline"
                        >
                          View / Download
                        </a>
                      ) : (
                        <span className="text-text-muted">URL failed</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-4">Status History</p>
              <StatusTimeline events={(events ?? []) as never} currentStatus={status} />
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-border p-5 space-y-3">
              <p className="text-xs font-semibold text-text-secondary">Current Status</p>
              <StatusBadge status={status} className="text-sm" />
            </div>

            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-3">Action Panel</p>
              <OrderActionPanel
                orderId={order.id}
                status={status}
                linkedPartName={linkedPartName}
                priceReference={priceReference}
                catalogParts={catalogParts}
                workshops={(verifiedWorkshops ?? []).map((w) => ({
                  id: w.id,
                  name: w.name,
                  capability_tags: w.capability_tags ?? [],
                }))}
                existingDrawingCount={existingDrawingCount}
                partHasDrawing={partHasDrawing}
                duplicateReOrderCount={duplicateReOrderCount}
              />
            </div>

            {category?.name && (
              <div className="bg-white rounded-lg border border-border p-5 space-y-1">
                <p className="text-xs font-semibold text-text-secondary">Part</p>
                <p className="text-sm font-medium text-text-primary">{part?.name}</p>
                <p className="text-sm text-text-secondary">{category.name}</p>
                {part?.manufacturability_grade && (
                  <p className="text-xs text-text-muted">Grade {part.manufacturability_grade}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
