import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WorkshopEditor } from '@/components/internal/WorkshopEditor'
import { formatDate } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import type { OrderStatus } from '@/lib/utils/status'
import type { WorkshopTier } from '@/lib/types/database.types'

export const metadata: Metadata = { title: 'PartBank — Detail Bengkel' }

interface Props {
  params: { workshopId: string }
}

export default async function WorkshopDetailPage({ params }: Props) {
  const supabase = await createClient()

  const { data: workshop } = await supabase
    .from('workshops')
    .select('id, name, address, capability_tags, tier, is_verified, created_at')
    .eq('id', params.workshopId)
    .single()

  if (!workshop) notFound()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, parts(name)')
    .eq('workshop_id', params.workshopId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader title={workshop.name} subtitle="Detail bengkel mitra" />
      <div className="p-6">
        <Link href="/internal/workshops?tab=active" className="text-sm text-navy-700 hover:underline mb-6 inline-block">
          ← Kembali ke Manajemen Bengkel
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-border p-5 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-text-primary">{workshop.name}</p>
                {workshop.is_verified ? (
                  <Badge className="border-0 bg-green-100 text-green-800 text-xs">Terverifikasi</Badge>
                ) : (
                  <Badge className="border-0 bg-amber-50 text-amber-700 text-xs">Pending</Badge>
                )}
              </div>
              {workshop.address && <p className="text-sm text-text-secondary">{workshop.address}</p>}
              <div className="flex flex-wrap gap-1">
                {(workshop.capability_tags ?? []).map((tag) => (
                  <Badge key={tag} className="border-0 bg-navy-50 text-navy-700 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-text-secondary">Tier: {workshop.tier}</p>
              <p className="text-xs text-text-muted">Terdaftar {formatDate(workshop.created_at)}</p>
            </div>

            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-3">Riwayat Order</p>
              {orders && orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Order ID</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead className="w-48">Status</TableHead>
                        <TableHead className="w-32">Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => {
                        const part = Array.isArray(o.parts) ? o.parts[0] : o.parts
                        return (
                          <TableRow key={o.id}>
                            <TableCell className="font-mono text-xs text-text-secondary">
                              {shortId(o.id)}
                            </TableCell>
                            <TableCell className="text-sm text-text-primary">{part?.name ?? '—'}</TableCell>
                            <TableCell>
                              <StatusBadge status={o.status as OrderStatus} />
                            </TableCell>
                            <TableCell className="text-sm text-text-secondary">
                              {formatDate(o.created_at)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="Belum ada order untuk bengkel ini" />
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-base font-medium text-text-primary mb-3">Edit Bengkel</p>
              <WorkshopEditor
                workshopId={workshop.id}
                initialTags={workshop.capability_tags ?? []}
                initialTier={workshop.tier as WorkshopTier}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
