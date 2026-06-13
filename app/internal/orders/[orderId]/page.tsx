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
import { formatCurrency, formatDate } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import type { OrderStatus } from '@/lib/utils/status'
import type { FileType } from '@/lib/types/database.types'

export const metadata: Metadata = { title: 'PartBank — Order (Internal)' }

const FILE_TYPE_LABELS: Record<FileType, string> = {
  re_receipt: 'Bukti Transfer RE',
  part_receipt: 'Bukti Transfer Part',
  drawing: 'Gambar Teknik',
  reference_photo: 'Foto Referensi',
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
       custom_part_name, custom_part_description, truck_info, created_at,
       parts(name, manufacturability_grade, part_categories(name)),
       customer:profiles!orders_customer_id_fkey(full_name),
       workshops(name)`
    )
    .eq('id', params.orderId)
    .single()

  if (!order) notFound()

  const [{ data: events }, { data: files }, { data: verifiedWorkshops }] = await Promise.all([
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
  const category = part
    ? Array.isArray(part.part_categories)
      ? part.part_categories[0]
      : part.part_categories
    : null
  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
  const workshop = Array.isArray(order.workshops) ? order.workshops[0] : order.workshops

  return (
    <div>
      <PageHeader
        title={`Order ${shortId(order.id)}`}
        subtitle={part?.name ?? order.custom_part_name ?? 'Custom Part Request'}
      />
      <div className="p-6">
        <Link href="/internal/orders" className="text-sm text-navy-700 hover:underline mb-6 inline-block">
          ← Kembali ke Semua Order
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
                  <span className="text-text-muted">Bengkel</span>
                  <p className="text-text-primary">{workshop?.name ?? 'Belum ditugaskan'}</p>
                </div>
                <div>
                  <span className="text-text-muted">Jumlah</span>
                  <p className="text-text-primary">{order.quantity} unit</p>
                </div>
                <div>
                  <span className="text-text-muted">Tanggal</span>
                  <p className="text-text-primary">{formatDate(order.created_at)}</p>
                </div>
                {order.re_fee != null && (
                  <div>
                    <span className="text-text-muted">Biaya RE</span>
                    <p className="text-text-primary">{formatCurrency(order.re_fee)}</p>
                  </div>
                )}
                {order.part_price != null && (
                  <div>
                    <span className="text-text-muted">Harga Part</span>
                    <p className="text-text-primary">{formatCurrency(order.part_price)}</p>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="text-sm pt-1">
                  <span className="text-text-muted">Catatan customer</span>
                  <p className="text-text-primary">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Custom part request info */}
            {!part && order.custom_part_name && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
                <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">
                  Custom Part Request — Part belum ada di katalog
                </p>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-amber-700">Nama Part</span>
                    <p className="text-text-primary font-medium">{order.custom_part_name}</p>
                  </div>
                  {order.truck_info && (
                    <div>
                      <span className="text-amber-700">Merek & Model Truk</span>
                      <p className="text-text-primary">{order.truck_info}</p>
                    </div>
                  )}
                  {order.custom_part_description && (
                    <div>
                      <span className="text-amber-700">Deskripsi & Spesifikasi</span>
                      <p className="text-text-primary whitespace-pre-wrap">{order.custom_part_description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Files */}
            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-3">Berkas Terlampir</p>
              {filesWithUrls.length === 0 ? (
                <p className="text-sm text-text-muted">Belum ada berkas.</p>
              ) : (
                <ul className="space-y-2">
                  {filesWithUrls.map((f) => (
                    <li key={f.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-text-secondary">
                        <FileText className="h-4 w-4 text-text-muted" />
                        {FILE_TYPE_LABELS[f.file_type as FileType]}
                        <span className="text-text-muted">· {formatDate(f.created_at)}</span>
                      </span>
                      {f.url ? (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy-700 hover:underline"
                        >
                          Lihat / Unduh
                        </a>
                      ) : (
                        <span className="text-text-muted">URL gagal</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
            </div>

            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-3">Panel Aksi</p>
              <OrderActionPanel
                orderId={order.id}
                status={status}
                workshops={(verifiedWorkshops ?? []).map((w) => ({
                  id: w.id,
                  name: w.name,
                  capability_tags: w.capability_tags ?? [],
                }))}
              />
            </div>

            {category?.name && (
              <div className="bg-white rounded-lg border border-border p-5 space-y-1">
                <p className="text-xs text-text-muted uppercase tracking-wide">Part</p>
                <p className="text-sm font-medium text-text-primary">{part?.name}</p>
                <p className="text-sm text-text-secondary">{category.name}</p>
                {part?.manufacturability_grade && (
                  <p className="text-sm text-text-secondary">Grade {part.manufacturability_grade}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
