import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import type { OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — Dashboard Bengkel' }

export default async function WorkshopDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: workshop } = await supabase
    .from('workshops')
    .select('id, name')
    .eq('profile_id', user!.id)
    .maybeSingle()

  // RLS restricts these to orders assigned to this workshop.
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, parts(name)')
    .order('created_at', { ascending: false })

  const all = orders ?? []
  const aktif = all.filter((o) => ['in_production', 'pending_qc'].includes(o.status)).length
  const menungguAksi = all.filter((o) => o.status === 'in_production').length
  const selesai = all.filter((o) => o.status === 'completed').length

  const metrics = [
    { label: 'Pesanan Aktif', value: aktif },
    { label: 'Menunggu Aksi', value: menungguAksi },
    { label: 'Selesai', value: selesai },
  ]
  const recent = all.slice(0, 10)

  return (
    <div>
      <PageHeader title="Dashboard Bengkel" subtitle={workshop?.name ?? 'Bengkel'} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-white rounded-lg border border-border p-5">
              <p className="text-2xl font-semibold text-navy-900">{m.value}</p>
              <p className="text-sm text-text-secondary mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-base font-medium text-text-primary mb-3">Pesanan Terbaru</h2>
          {recent.length > 0 ? (
            <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Order ID</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead className="w-48">Status</TableHead>
                    <TableHead className="w-32">Tanggal</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((o) => {
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
                        <TableCell className="text-right">
                          <Link href={`/workshop/orders/${o.id}`}>
                            <Button variant="outline" size="sm">
                              Detail
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="Belum ada pesanan yang ditugaskan" />
          )}
        </div>
      </div>
    </div>
  )
}
