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
import type { OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — Pesanan Bengkel' }

const TABS = [
  { key: 'semua', label: 'Semua' },
  { key: 'aksi', label: 'Perlu Aksi' },
  { key: 'selesai', label: 'Selesai' },
] as const

function matchesFilter(status: OrderStatus, filter: string): boolean {
  if (filter === 'aksi') return status === 'in_production'
  if (filter === 'selesai') return status === 'completed'
  return true
}

interface Props {
  searchParams: { tab?: string }
}

export default async function WorkshopOrdersPage({ searchParams }: Props) {
  const filter = searchParams.tab ?? 'semua'
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, quantity, created_at, parts(name)')
    .order('created_at', { ascending: false })

  const filtered = (orders ?? []).filter((o) => matchesFilter(o.status as OrderStatus, filter))

  return (
    <div>
      <PageHeader title="Pesanan Saya" subtitle="Pesanan yang ditugaskan ke bengkel Anda" />
      <div className="p-6 space-y-4">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/workshop/orders?tab=${t.key}`}
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
                  <TableHead>Part</TableHead>
                  <TableHead className="w-20">Jumlah</TableHead>
                  <TableHead className="w-48">Status</TableHead>
                  <TableHead className="w-32">Tanggal</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const part = Array.isArray(o.parts) ? o.parts[0] : o.parts
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs text-text-secondary">
                        {shortId(o.id)}
                      </TableCell>
                      <TableCell className="text-sm text-text-primary">{part?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-text-secondary">{o.quantity}</TableCell>
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
          <EmptyState title="Belum ada pesanan pada filter ini" />
        )}
      </div>
    </div>
  )
}
