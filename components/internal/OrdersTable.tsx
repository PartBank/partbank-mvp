'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import { NEEDS_INTERNAL_ACTION } from '@/lib/types/order'
import type { OrderStatus } from '@/lib/utils/status'

export interface OrderRow {
  id: string
  status: string
  created_at: string
  parts: { name: string } | { name: string }[] | null
  customer: { full_name: string | null } | { full_name: string | null }[] | null
  workshops: { name: string } | { name: string }[] | null
}

interface Props {
  orders: OrderRow[]
  showSearch?: boolean
  viewAllHref?: string
}

export function OrdersTable({ orders, showSearch = true, viewAllHref }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      const part = Array.isArray(o.parts) ? o.parts[0] : o.parts
      const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
      const workshop = Array.isArray(o.workshops) ? o.workshops[0] : o.workshops
      return (
        part?.name?.toLowerCase().includes(q) ||
        customer?.full_name?.toLowerCase().includes(q) ||
        workshop?.name?.toLowerCase().includes(q) ||
        shortId(o.id).toLowerCase().includes(q)
      )
    })
  }, [orders, search])

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by part, customer, workshop, or order ID…"
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-text-muted">
            {search ? `No orders match "${search}"` : 'No orders in this filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-4 py-2.5 w-28">Order ID</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-4 py-2.5 w-44">Customer</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-4 py-2.5">Part</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-4 py-2.5 w-36">Workshop</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-4 py-2.5 w-52">Status</th>
                <th className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-4 py-2.5 w-44">Date</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((o) => {
                const part = Array.isArray(o.parts) ? o.parts[0] : o.parts
                const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
                const workshop = Array.isArray(o.workshops) ? o.workshops[0] : o.workshops
                const needsAction = NEEDS_INTERNAL_ACTION.includes(o.status as OrderStatus)

                return (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/internal/orders/${o.id}`)}
                    className="group cursor-pointer hover:bg-surface-secondary transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {needsAction && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />}
                        <span className="font-mono text-xs text-text-secondary">{shortId(o.id)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-text-primary">{customer?.full_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-text-primary">{part?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs">{workshop?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={o.status as OrderStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                    <td className="pr-3 py-2.5">
                      <ChevronRight className="h-3.5 w-3.5 text-text-muted opacity-30 group-hover:opacity-70 transition-opacity" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {viewAllHref && (
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={7}>
                    <Link
                      href={viewAllHref}
                      className="flex items-center justify-center gap-1 py-2.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    >
                      View all orders
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
