import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatusTimeline } from '@/components/shared/StatusTimeline'
import { UploadReceiptForm } from '@/components/customer/UploadReceiptForm'
import { formatCurrency, formatDate } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import { type OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — Detail Pesanan' }

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending_re_confirmation: 'Tim PartBank sedang meninjau permintaan Anda.',
  pending_re_payment: 'Silakan lakukan pembayaran biaya Reverse Engineering.',
  pending_re_receipt: 'Bukti transfer RE sedang diverifikasi.',
  re_in_progress: 'Proses Reverse Engineering sedang berjalan.',
  pending_price_estimation: 'Estimasi harga sedang disiapkan.',
  pending_part_payment: 'Silakan lakukan pembayaran part.',
  pending_payment_confirmation: 'Bukti pembayaran part sedang diverifikasi.',
  finding_workshop: 'PartBank sedang mencari bengkel yang sesuai.',
  in_production: 'Part Anda sedang diproduksi oleh bengkel.',
  pending_qc: 'Part sedang menjalani inspeksi QC.',
  qc_failed_cancelled: 'Part gagal QC. Order dibatalkan.',
  cancelled_refunded: 'Order dibatalkan dan refund telah diproses.',
  in_delivery: 'Part sedang dalam perjalanan ke alamat Anda.',
  completed: 'Pesanan telah selesai.',
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
       parts(name, manufacturability_grade, part_categories(name))`
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
    <div>
      <PageHeader title="Detail Pesanan" subtitle={part?.name} />
      <div className="p-6">
        <Link href="/orders" className="text-sm text-navy-700 hover:underline mb-6 inline-block">
          ← Kembali ke Pesanan Saya
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
                  <span className="text-text-muted">Jumlah</span>
                  <p className="text-text-primary">{order.quantity} unit</p>
                </div>
                <div>
                  <span className="text-text-muted">Tanggal Order</span>
                  <p className="text-text-primary">{formatDate(order.created_at)}</p>
                </div>
              </div>
              {order.notes && (
                <div className="pt-2 text-sm">
                  <span className="text-text-muted">Catatan</span>
                  <p className="text-text-primary">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Conditional action card */}
            {status === 'pending_re_payment' && (
              <div className="bg-white rounded-lg border border-border p-5 space-y-3">
                <p className="text-base font-medium text-text-primary">Pembayaran Biaya RE</p>
                <p className="text-2xl font-semibold text-navy-900">
                  {order.re_fee ? formatCurrency(order.re_fee) : '—'}
                </p>
                <p className="text-sm text-text-secondary">Lakukan transfer ke rekening PartBank:</p>
                <p className="text-sm font-medium text-text-primary">{BANK_INFO}</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-text-secondary mb-2">Sudah bayar? Upload bukti transfer:</p>
                  <UploadReceiptForm orderId={order.id} fileType="re_receipt" />
                </div>
              </div>
            )}

            {status === 'pending_part_payment' && (
              <div className="bg-white rounded-lg border border-border p-5 space-y-3">
                <p className="text-base font-medium text-text-primary">Pembayaran Part</p>
                <p className="text-2xl font-semibold text-navy-900">
                  {order.part_price ? formatCurrency(order.part_price) : '—'}
                </p>
                <p className="text-sm text-text-secondary">Lakukan transfer ke rekening PartBank:</p>
                <p className="text-sm font-medium text-text-primary">{BANK_INFO}</p>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-text-secondary mb-2">Sudah bayar? Upload bukti transfer:</p>
                  <UploadReceiptForm orderId={order.id} fileType="part_receipt" />
                </div>
              </div>
            )}

            {(status === 'pending_re_receipt' || status === 'pending_payment_confirmation') && (
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
                <p className="text-sm text-amber-800">
                  Bukti transfer sedang diverifikasi oleh tim PartBank.
                </p>
              </div>
            )}

            {status === 'qc_failed_cancelled' && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Order dibatalkan karena part gagal QC.</p>
                </div>
                {order.qc_failure_notes && (
                  <p className="text-sm text-red-700">Catatan: {order.qc_failure_notes}</p>
                )}
                <p className="text-sm text-red-700">Refund sedang diproses oleh tim PartBank.</p>
              </div>
            )}

            {status === 'cancelled_refunded' && (
              <div className="bg-white rounded-lg border border-border p-5">
                <p className="text-sm text-text-secondary">
                  Refund telah diproses. Dana akan masuk dalam 1–3 hari kerja.
                </p>
              </div>
            )}

            {status === 'in_delivery' && (
              <div className="bg-green-50 rounded-lg border border-green-200 p-5 space-y-1">
                <p className="text-sm font-medium text-green-800">Part sedang dalam pengiriman</p>
                {order.tracking_number && (
                  <p className="text-sm text-green-700">
                    Nomor Resi: <span className="font-mono font-medium">{order.tracking_number}</span>
                  </p>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-4">Riwayat Status</p>
              <StatusTimeline events={(events ?? []) as never} currentStatus={status} />
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-border p-5 space-y-3">
              <p className="text-xs text-text-muted uppercase tracking-wide">Status Saat Ini</p>
              <StatusBadge status={status} className="text-sm" />
              <p className="text-sm text-text-secondary">{STATUS_DESCRIPTIONS[status]}</p>
            </div>

            <div className="bg-white rounded-lg border border-border p-5 space-y-2">
              <p className="text-xs text-text-muted uppercase tracking-wide">Informasi Part</p>
              <p className="text-sm font-medium text-text-primary">{part?.name}</p>
              {category?.name && <p className="text-sm text-text-secondary">{category.name}</p>}
              {part?.manufacturability_grade && (
                <p className="text-sm text-text-secondary">Grade {part.manufacturability_grade}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
