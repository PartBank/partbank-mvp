import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OrdersTable } from '@/components/internal/OrdersTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { NEEDS_INTERNAL_ACTION, TERMINAL_STATUSES } from '@/lib/types/order'
import type { OrderStatus } from '@/lib/utils/status'

export const metadata: Metadata = { title: 'PartBank — All Orders' }

const TABS = [
  { key: 'all',        label: 'All' },
  { key: 'action',     label: 'Needs Action' },
  { key: 'production', label: 'In Production' },
  { key: 'qc',         label: 'QC' },
  { key: 'done',       label: 'Completed' },
] as const

function matchesFilter(status: OrderStatus, filter: string): boolean {
  switch (filter) {
    case 'action':     return NEEDS_INTERNAL_ACTION.includes(status)
    case 'production': return status === 'in_production'
    case 'qc':         return status === 'pending_qc'
    case 'done':       return TERMINAL_STATUSES.includes(status)
    default:           return true
  }
}

interface Props {
  searchParams: { tab?: string }
}

export default async function InternalOrdersPage({ searchParams }: Props) {
  const filter = searchParams.tab ?? 'all'
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, parts(name), customer:profiles!orders_customer_id_fkey(full_name), workshops(name)')
    .order('created_at', { ascending: false })

  const all = orders ?? []

  const counts: Record<string, number> = {
    all:        all.length,
    action:     all.filter((o) => matchesFilter(o.status as OrderStatus, 'action')).length,
    production: all.filter((o) => matchesFilter(o.status as OrderStatus, 'production')).length,
    qc:         all.filter((o) => matchesFilter(o.status as OrderStatus, 'qc')).length,
    done:       all.filter((o) => matchesFilter(o.status as OrderStatus, 'done')).length,
  }

  const filtered = all.filter((o) => matchesFilter(o.status as OrderStatus, filter))

  return (
    <div className="px-8 pt-7 pb-10">
      <PageHeader title="Orders" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map((t) => {
          const isAction = t.key === 'action'
          const count = counts[t.key]
          const active = filter === t.key
          return (
            <Link
              key={t.key}
              href={`/internal/orders?tab=${t.key}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                active
                  ? 'border-navy-900 text-navy-900 font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {t.label}
              {count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
                  active
                    ? 'bg-navy-100 text-navy-800'
                    : isAction && count > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-surface-secondary text-text-muted'
                )}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <OrdersTable orders={filtered} />
    </div>
  )
}
