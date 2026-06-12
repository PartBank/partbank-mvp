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
import { TERMINAL_STATUSES } from '@/lib/types/order'
import type { OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — Dashboard Internal' }

export default async function InternalDashboardPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, parts(name), customer:profiles!orders_customer_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  const all = orders ?? []
  const activeCount = all.filter((o) => !TERMINAL_STATUSES.includes(o.status as OrderStatus)).length
  const waitingConfirm = all.filter((o) =>
    ['pending_re_confirmation', 'pending_re_receipt', 'pending_payment_confirmation'].includes(o.status)
  ).length
  const inProduction = all.filter((o) => o.status === 'in_production').length
  const pendingQc = all.filter((o) => o.status === 'pending_qc').length

  const metrics = [
    { label: 'Total Order Aktif', value: activeCount },
    { label: 'Menunggu Konfirmasi', value: waitingConfirm },
    { label: 'Dalam Produksi', value: inProduction },
    { label: 'Menunggu QC', value: pendingQc },
  ]

  const recent = all.slice(0, 10)
  const today = formatDate(new Date().toISOString())

  return (
    <div>
      <PageHeader title="Dashboard Internal" subtitle={today} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-white rounded-lg border border-border p-5">
              <p className="text-2xl font-semibold text-navy-900">{m.value}</p>
              <p className="text-sm text-text-secondary mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-base font-medium text-text-primary mb-3">Order Terbaru</h2>
          {recent.length > 0 ? (
            <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead className="w-48">Status</TableHead>
                    <TableHead className="w-32">Tanggal</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((o) => {
                    const part = Array.isArray(o.parts) ? o.parts[0] : o.parts
                    const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs text-text-secondary">
                          {shortId(o.id)}
                        </TableCell>
                        <TableCell className="text-sm text-text-primary">
                          {customer?.full_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-text-primary">{part?.name ?? '—'}</TableCell>
                        <TableCell>
                          <StatusBadge status={o.status as OrderStatus} />
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary">
                          {formatDate(o.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/internal/orders/${o.id}`}>
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
            <EmptyState title="Belum ada order masuk" />
          )}
        </div>
      </div>
    </div>
  )
}
