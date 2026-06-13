import type { OrderStatus } from '@/lib/types/database.types'

export type { OrderStatus }

export const ORDER_STATUS = {
  PENDING_RE_CONFIRMATION: 'pending_re_confirmation',
  PENDING_RE_PAYMENT: 'pending_re_payment',
  PENDING_RE_RECEIPT: 'pending_re_receipt',
  RE_IN_PROGRESS: 're_in_progress',
  PENDING_PRICE_ESTIMATION: 'pending_price_estimation',
  PENDING_PART_PAYMENT: 'pending_part_payment',
  PENDING_PAYMENT_CONFIRMATION: 'pending_payment_confirmation',
  FINDING_WORKSHOP: 'finding_workshop',
  IN_PRODUCTION: 'in_production',
  PENDING_QC: 'pending_qc',
  QC_FAILED_CANCELLED: 'qc_failed_cancelled',
  CANCELLED_REFUNDED: 'cancelled_refunded',
  IN_DELIVERY: 'in_delivery',
  COMPLETED: 'completed',
} as const satisfies Record<string, OrderStatus>

// Status helper groupings used by dashboards and filters.
export const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled_refunded']

export const ACTIVE_STATUSES: OrderStatus[] = [
  'pending_re_confirmation',
  'pending_re_payment',
  'pending_re_receipt',
  're_in_progress',
  'pending_price_estimation',
  'pending_part_payment',
  'pending_payment_confirmation',
  'finding_workshop',
  'in_production',
  'pending_qc',
  'in_delivery',
]

// Statuses that require an action from internal staff.
export const NEEDS_INTERNAL_ACTION: OrderStatus[] = [
  'pending_re_confirmation',
  'pending_re_receipt',
  're_in_progress',
  'finding_workshop',
  'pending_payment_confirmation',
  'pending_qc',
  'qc_failed_cancelled',
  'in_delivery',
]

// Customer-facing notification message templates (CONTEXT §8).
export const NOTIFICATION_MESSAGES: Partial<Record<OrderStatus, string>> = {
  pending_re_payment: 'RE fee confirmed. Please proceed with payment.',
  re_in_progress: 'RE payment confirmed. Reverse Engineering is now in progress.',
  pending_price_estimation: 'Your order is being reviewed. Price estimate is being prepared.',
  pending_part_payment: 'Price estimate ready. Please proceed with payment.',
  in_production: 'Workshop assigned. Production has started.',
  pending_qc: 'Part is undergoing PartBank QC inspection.',
  qc_failed_cancelled: 'Part failed QC. Order cancelled. Refund will be processed shortly.',
  cancelled_refunded: 'Refund processed. Funds will arrive within 1–3 business days.',
  in_delivery: 'Part passed QC and is now in delivery.',
  completed: 'Your order is complete. Thank you!',
}

export const WORKSHOP_ASSIGNED_MESSAGE = 'You have received a new order from PartBank.'
