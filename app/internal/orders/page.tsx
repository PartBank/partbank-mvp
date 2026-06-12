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
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import { NEEDS_INTERNAL_ACTION, TERMINAL_STATUSES } from '@/lib/types/order'
import type { OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — Semua Order' }

const TABS = [
  { key: 'semua', label: 'Semua' },
  { key: 'aksi', label: 'Perlu Aksi' },
  { key: 'produksi', label: 'Dalam Produksi' },
  { key: 'qc', label: 'QC' },
  { key: 'selesai', label: 'Selesai' },
] as const

function matchesFilter(status: OrderStatus, filter: string): boolean {
  switch (filter) {
    case 'aksi':
      return NEEDS_INTERNAL_ACTION.includes(status)
    case 'produksi':
      return status === 'in_production'
    case 'qc':
      return status === 'pending_qc'
    case 'selesai':
      return TERMINAL_STATUSES.includes(status)
    default:
      return true
  }
}

interface Props {
  searchParams: { tab?: string }
}

export default async function InternalOrdersPage({ searchParams }: Props) {
  const filter = searchParams.tab ?? 'semua'
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, status, created_at, parts(name), customer:profiles!orders_customer_id_fkey(full_name), workshops(name)'
    )
    .order('created_at', { ascending: false })

  const filtered = (orders ?? []).filter((o) => matchesFilter(o.status as OrderStatus, filter))

  return (
    <div>
      <PageHeader title="Semua Order" subtitle="Kelola seluruh pesanan PartBank" />
      <div className="p-6 space-y-4">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/internal/orders?tab=${t.key}`}
              className={cn(
                'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                filter === t.key
                  ? 'border-navy-900 text-navy-900 font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Bengkel</TableHead>
                  <TableHead className="w-48">Status</TableHead>
                  <TableHead className="w-32">Tanggal</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const part = Array.isArray(o.parts) ? o.parts[0] : o.parts
                  const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
                  const workshop = Array.isArray(o.workshops) ? o.workshops[0] : o.workshops
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs text-text-secondary">
                        {shortId(o.id)}
                      </TableCell>
                      <TableCell className="text-sm text-text-primary">
                        {customer?.full_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-text-primary">{part?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {workshop?.name ?? '—'}
                      </TableCell>
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
          <EmptyState title="Tidak ada order pada filter ini" />
        )}
      </div>
    </div>
  )
}
