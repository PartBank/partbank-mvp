import Link from 'next/link'
import type { Metadata } from 'next'
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, CreditCard, Package, TrendingUp, Wrench, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OrdersTable } from '@/components/internal/OrdersTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { shortId } from '@/lib/utils/format'
import { NEEDS_INTERNAL_ACTION, TERMINAL_STATUSES } from '@/lib/types/order'
import type { OrderStatus } from '@/lib/utils/status'
import type { ElementType } from 'react'

export const metadata: Metadata = { title: 'PartBank — Internal Dashboard' }

const ACTION_HINTS: Partial<Record<OrderStatus, string>> = {
  pending_re_confirmation:      'Set RE fee',
  pending_re_receipt:           'Confirm RE payment',
  re_in_progress:               'Upload technical drawing',
  finding_workshop:             'Assign workshop & set price',
  pending_payment_confirmation: 'Confirm part payment',
  pending_qc:                   'Inspect & run QC',
  qc_failed_cancelled:          'Process refund',
  in_delivery:                  'Confirm delivery complete',
}

interface MetricCardProps {
  icon: ElementType
  label: string
  valueLabel: string
  href: string
  iconClass: string
  urgent?: boolean
}

function MetricCard({ icon: Icon, label, valueLabel, href, iconClass, urgent }: MetricCardProps) {
  const isLong = valueLabel.length > 8
  return (
    <Link
      href={href}
      className={[
        'group bg-white rounded-xl border p-5 hover:shadow-sm transition-all flex items-start justify-between gap-2',
        urgent && valueLabel !== '0' ? 'border-amber-300 hover:border-amber-400' : 'border-border hover:border-navy-700/30',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className={`font-semibold text-text-primary truncate ${isLong ? 'text-base' : 'text-2xl'}`}>
          {valueLabel}
        </p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
    </Link>
  )
}

export default async function InternalDashboardPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at, re_fee, part_price, parts(name), customer:profiles!orders_customer_id_fkey(full_name), workshops(name)')
    .order('created_at', { ascending: false })

  const all = orders ?? []

  const activeCount      = all.filter((o) => !TERMINAL_STATUSES.includes(o.status as OrderStatus)).length
  const needsActionCount = all.filter((o) => NEEDS_INTERNAL_ACTION.includes(o.status as OrderStatus)).length
  const inProduction     = all.filter((o) => o.status === 'in_production').length
  const pendingQc        = all.filter((o) => o.status === 'pending_qc').length

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const ordersToday = all.filter((o) => new Date(o.created_at) >= todayStart).length

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const completedThisMonth = all.filter(
    (o) => o.status === 'completed' && new Date(o.created_at) >= monthStart
  ).length
  const revenueThisMonth = all
    .filter((o) => o.status === 'completed' && new Date(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + ((o as { part_price?: number | null }).part_price ?? 0), 0)

  const pendingRevenue = all
    .filter((o) => o.status === 'pending_part_payment' || o.status === 'pending_re_payment')
    .reduce((sum, o) => {
      if (o.status === 'pending_part_payment') return sum + ((o as { part_price?: number | null }).part_price ?? 0)
      if (o.status === 'pending_re_payment') return sum + ((o as { re_fee?: number | null }).re_fee ?? 0)
      return sum
    }, 0)

  const needsActionOrders = all.filter((o) => NEEDS_INTERNAL_ACTION.includes(o.status as OrderStatus))
  const recent = all.slice(0, 5)

  return (
    <div className="px-8 pt-7 pb-10">
      <PageHeader title="Dashboard" />

      {/* Metric cards — 4 in a row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={Package}
          label="Active Orders"
          valueLabel={String(activeCount)}
          href="/internal/orders"
          iconClass="bg-navy-50 text-navy-700"
        />
        <MetricCard
          icon={Zap}
          label="Needs Action"
          valueLabel={String(needsActionCount)}
          href="/internal/orders?tab=action"
          iconClass="bg-amber-50 text-amber-600"
          urgent
        />
        <MetricCard
          icon={Wrench}
          label="In Production"
          valueLabel={String(inProduction)}
          href="/internal/orders?tab=production"
          iconClass="bg-indigo-50 text-indigo-600"
        />
        <MetricCard
          icon={ClipboardCheck}
          label="Awaiting QC"
          valueLabel={String(pendingQc)}
          href="/internal/orders?tab=qc"
          iconClass="bg-green-50 text-green-600"
        />
      </div>

      {/* Needs Action spotlight */}
      {needsActionOrders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Needs Your Attention</h2>
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5">
              {needsActionOrders.length}
            </span>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden divide-y divide-border">
            {needsActionOrders.slice(0, 5).map((o) => {
              const part = Array.isArray(o.parts) ? o.parts[0] : o.parts
              const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
              const hint = ACTION_HINTS[o.status as OrderStatus] ?? 'Review order'
              return (
                <Link
                  key={o.id}
                  href={`/internal/orders/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50/40 transition-colors group"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="font-mono text-xs text-text-muted w-16 shrink-0">{shortId(o.id)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{part?.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{customer?.full_name ?? '—'}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-700 shrink-0">{hint}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              )
            })}
            {needsActionOrders.length > 5 && (
              <Link
                href="/internal/orders?tab=action"
                className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs text-amber-700 font-medium hover:bg-amber-50/40 transition-colors"
              >
                +{needsActionOrders.length - 5} more
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Recent Orders</h2>
        <OrdersTable orders={recent} showSearch={false} viewAllHref="/internal/orders" />
      </div>

      {/* Snapshot stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: CalendarDays, label: 'Orders Today',          value: String(ordersToday),                                                              bg: 'bg-sky-50',     text: 'text-sky-600' },
          { icon: CreditCard,   label: 'Pending Revenue',       value: pendingRevenue > 0 ? formatCurrency(pendingRevenue) : '—',                        bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { icon: CheckCircle2, label: 'Completed This Month',  value: String(completedThisMonth),                                                       bg: 'bg-green-50',   text: 'text-green-600' },
          { icon: TrendingUp,   label: 'Revenue This Month',    value: revenueThisMonth > 0 ? formatCurrency(revenueThisMonth) : '—',                    bg: 'bg-violet-50',  text: 'text-violet-600' },
        ].map(({ icon: Icon, label, value, bg, text }) => (
          <div key={label} className="bg-white rounded-xl border border-border px-5 py-4 flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${bg} ${text}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-text-primary truncate ${value.length > 8 ? 'text-base' : 'text-2xl'}`}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
