import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatusTimeline } from '@/components/shared/StatusTimeline'
import { UploadReceiptForm } from '@/components/customer/UploadReceiptForm'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import { type OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — Order Detail' }

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending_re_confirmation: 'PartBank is reviewing your request.',
  pending_re_payment: 'Please complete the Reverse Engineering fee payment.',
  pending_re_receipt: 'Your RE transfer receipt is being verified.',
  re_in_progress: 'Reverse Engineering is in progress.',
  pending_price_estimation: 'A price estimate is being prepared.',
  pending_part_payment: 'Please complete the part payment.',
  pending_payment_confirmation: 'Your part payment receipt is being verified.',
  finding_workshop: 'PartBank is finding a suitable workshop.',
  in_production: 'Your part is being manufactured by a workshop.',
  pending_qc: 'Part is undergoing QC inspection.',
  qc_failed_cancelled: 'Part failed QC. Order cancelled.',
  cancelled_refunded: 'Order cancelled and refund has been processed.',
  in_delivery: 'Part is on its way to you.',
  completed: 'Order complete.',
}

const BANK_INFO = 'BCA 1234567890 a.n. PartBank Indonesia'

interface Props {
  params: { orderId: string }
}

export default async function OrderDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select(
      `id, status, quantity, notes, re_fee, part_price, tracking_number, qc_failure_notes, created_at,
       parts(name, part_categories(name))`
    )
    .eq('id', params.orderId)
    .single()

  if (!order) notFound()

  const { data: events } = await supabase
    .from('order_events')
    .select('id, to_status, notes, created_at')
    .eq('order_id', params.orderId)
    .order('created_at', { ascending: true })

  const status = order.status as OrderStatus
  const part = Array.isArray(order.parts) ? order.parts[0] : order.parts
  const category = part
    ? Array.isArray(part.part_categories)
      ? part.part_categories[0]
      : part.part_categories
    : null

  return (
    <div className="px-8 pt-7 pb-10">
      <PageHeader title="Order Detail" subtitle={part?.name} />
      <div>
        <Link href="/orders" className="text-sm text-navy-700 hover:underline mb-6 inline-block">
          ← Back to My Orders
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order info */}
            <div className="bg-white rounded-lg border border-border p-5 space-y-2">
              <p className="font-mono text-xs text-text-muted">{shortId(order.id)}</p>
              <p className="text-base font-semibold text-text-primary">{part?.name}</p>
              <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                <div>
                  <span className="text-text-muted">Qty</span>
                  <p className="text-text-primary">{order.quantity} unit</p>
                </div>
                <div>
                  <span className="text-text-muted">Order Date</span>
                  <p className="text-text-primary">{formatDateTime(order.created_at)}</p>
                </div>
              </div>
              {order.notes && (
                <div className="pt-2 text-sm">
                  <span className="text-text-muted">Notes</span>
                  <p className="text-text-primary">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Conditional action card */}
            {status === 'pending_re_payment' && (
              <div className="bg-white rounded-lg border border-border p-5 space-y-3">
                <p className="text-base font-medium text-text-primary">RE Fee Payment</p>
                <p className="text-2xl font-semibold text-navy-900">
                  {order.re_fee ? formatCurrency(order.re_fee) : '—'}
                </p>
                <p className="text-sm text-text-secondary">Transfer to PartBank account:</p>
                <p className="text-sm font-medium text-text-primary">{BANK_INFO}</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-text-secondary mb-2">Already paid? Upload transfer receipt:</p>
                  <UploadReceiptForm orderId={order.id} fileType="re_receipt" />
                </div>
              </div>
            )}

            {status === 'pending_part_payment' && (
              <div className="bg-white rounded-lg border border-border p-5 space-y-3">
                <p className="text-base font-medium text-text-primary">Part Payment</p>
                <p className="text-2xl font-semibold text-navy-900">
                  {order.part_price ? formatCurrency(order.part_price) : '—'}
                </p>
                <p className="text-sm text-text-secondary">Transfer to PartBank account:</p>
                <p className="text-sm font-medium text-text-primary">{BANK_INFO}</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-text-secondary mb-2">Already paid? Upload transfer receipt:</p>
                  <UploadReceiptForm orderId={order.id} fileType="part_receipt" />
                </div>
              </div>
            )}

            {(status === 'pending_re_receipt' || status === 'pending_payment_confirmation') && (
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
                <p className="text-sm text-amber-800">
                  Transfer receipt is being verified by PartBank.
                </p>
              </div>
            )}

            {status === 'qc_failed_cancelled' && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Order cancelled — part failed QC.</p>
                </div>
                {order.qc_failure_notes && (
                  <p className="text-sm text-red-700">Notes: {order.qc_failure_notes}</p>
                )}
                <p className="text-sm text-red-700">Refund is being processed by PartBank.</p>
              </div>
            )}

            {status === 'cancelled_refunded' && (
              <div className="bg-white rounded-lg border border-border p-5">
                <p className="text-sm text-text-secondary">
                  Refund processed. Funds will arrive within 1–3 business days.
                </p>
              </div>
            )}

            {status === 'in_delivery' && (
              <div className="bg-green-50 rounded-lg border border-green-200 p-5 space-y-1">
                <p className="text-sm font-medium text-green-800">Part is in delivery</p>
                {order.tracking_number && (
                  <p className="text-sm text-green-700">
                    Tracking: <span className="font-mono font-medium">{order.tracking_number}</span>
                  </p>
                )}
              </div>
            )}

            {/* Timeline */}
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
              <p className="text-sm text-text-secondary">{STATUS_DESCRIPTIONS[status]}</p>
            </div>

            <div className="bg-white rounded-lg border border-border p-5 space-y-2">
              <p className="text-xs font-semibold text-text-secondary">Part Info</p>
              <p className="text-sm font-medium text-text-primary">{part?.name}</p>
              {category?.name && <p className="text-sm text-text-secondary">{category.name}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
