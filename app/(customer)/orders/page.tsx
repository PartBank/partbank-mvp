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

export const metadata: Metadata = { title: 'PartBank — Pesanan Saya' }

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, parts(name)')
    .eq('customer_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader title="Pesanan Saya" subtitle="Daftar semua permintaan part Anda" />
      <div className="p-6">
        {orders && orders.length > 0 ? (
          <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">No. Order</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead className="w-36">Tanggal</TableHead>
                  <TableHead className="w-48">Status</TableHead>
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const part = Array.isArray(order.parts) ? order.parts[0] : order.parts
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs text-text-secondary">
                        {shortId(order.id)}
                      </TableCell>
                      <TableCell className="font-medium text-text-primary">
                        {part?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status as OrderStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            Lihat Detail
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
          <EmptyState
            title="Belum ada pesanan"
            description="Mulai dari katalog untuk membuat permintaan part."
            action={
              <Link href="/catalog">
                <Button className="bg-navy-900 hover:bg-navy-800 text-white">Buka Katalog</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  )
}
