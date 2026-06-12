import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/supabase/storage'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatusTimeline } from '@/components/shared/StatusTimeline'
import { WorkshopActionPanel } from '@/components/workshop/WorkshopActionPanel'
import { formatDate } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import type { OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — Order (Bengkel)' }

const DRAWING_VISIBLE: OrderStatus[] = [
  'in_production',
  'pending_qc',
  'qc_failed_cancelled',
  'cancelled_refunded',
  'in_delivery',
  'completed',
]

interface Props {
  params: { orderId: string }
}

export default async function WorkshopOrderDetailPage({ params }: Props) {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, quantity, notes, qc_failure_notes, created_at, parts(name)')
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
  const accepted = (events ?? []).some((e) => e.notes?.includes('menerima'))

  // Technical drawing — only once production has begun.
  let drawing: { url: string | null; created_at: string } | null = null
  if (DRAWING_VISIBLE.includes(status)) {
    const { data: drawingFile } = await supabase
      .from('files')
      .select('storage_path, created_at')
      .eq('order_id', params.orderId)
      .eq('file_type', 'drawing')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (drawingFile) {
      const { url } = await getSignedUrl({
        bucket: 'drawings',
        path: drawingFile.storage_path,
        expiresIn: 3600,
      })
      drawing = { url, created_at: drawingFile.created_at }
    }
  }

  return (
    <div>
      <PageHeader title={`Order ${shortId(order.id)}`} subtitle={part?.name} />
      <div className="p-6">
        <Link href="/workshop/orders" className="text-sm text-navy-700 hover:underline mb-6 inline-block">
          ← Kembali ke Pesanan
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-border p-5 space-y-2">
              <p className="font-mono text-xs text-text-muted">{shortId(order.id)}</p>
              <p className="text-base font-semibold text-text-primary">{part?.name}</p>
              <p className="text-sm text-text-secondary">Jumlah: {order.quantity} unit</p>
              {order.notes && (
                <div className="text-sm pt-1">
                  <span className="text-text-muted">Catatan dari PartBank</span>
                  <p className="text-text-primary">{order.notes}</p>
                </div>
              )}
            </div>

            {DRAWING_VISIBLE.includes(status) && (
              <div className="bg-white rounded-lg border border-border p-5">
                <p className="text-base font-medium text-text-primary mb-2">Gambar Teknik</p>
                {drawing ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <FileText className="h-4 w-4 text-text-muted" />
                      Gambar Teknik · {formatDate(drawing.created_at)}
                    </span>
                    {drawing.url ? (
                      <a
                        href={drawing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy-700 hover:underline"
                      >
                        Unduh Gambar
                      </a>
                    ) : (
                      <span className="text-text-muted">URL gagal</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Gambar teknik belum tersedia.</p>
                )}
              </div>
            )}

            {status === 'qc_failed_cancelled' && order.qc_failure_notes && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-5">
                <p className="text-sm font-medium text-red-800">Part gagal QC. Order dibatalkan.</p>
                <p className="text-sm text-red-700 mt-1">Catatan: {order.qc_failure_notes}</p>
              </div>
            )}

            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-4">Riwayat Status</p>
              <StatusTimeline events={(events ?? []) as never} currentStatus={status} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-border p-5 space-y-3">
              <p className="text-xs text-text-muted uppercase tracking-wide">Status Saat Ini</p>
              <StatusBadge status={status} className="text-sm" />
            </div>

            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-3">Panel Aksi</p>
              <WorkshopActionPanel orderId={order.id} status={status} accepted={accepted} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
