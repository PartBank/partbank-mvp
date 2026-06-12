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
  'pending_payment_confirmation',
  'finding_workshop',
  'pending_qc',
  'qc_failed_cancelled',
  'in_delivery',
]

// Customer-facing notification message templates (CONTEXT §8).
export const NOTIFICATION_MESSAGES: Partial<Record<OrderStatus, string>> = {
  pending_re_payment: 'Biaya Reverse Engineering telah dikonfirmasi. Silakan lakukan pembayaran.',
  re_in_progress: 'Pembayaran RE dikonfirmasi. Proses Reverse Engineering dimulai.',
  pending_price_estimation: 'Gambar teknik selesai. Estimasi harga sedang disiapkan.',
  pending_part_payment: 'Estimasi harga tersedia. Silakan lakukan pembayaran.',
  in_production: 'Bengkel telah ditugaskan. Produksi dimulai.',
  pending_qc: 'Part sedang dalam inspeksi QC PartBank.',
  qc_failed_cancelled: 'Part gagal QC. Order dibatalkan. Refund akan segera diproses.',
  cancelled_refunded: 'Refund telah diproses. Dana akan masuk dalam 1-3 hari kerja.',
  in_delivery: 'Part lolos QC dan sedang dalam pengiriman.',
  completed: 'Pesanan Anda telah selesai. Terima kasih!',
}

export const WORKSHOP_ASSIGNED_MESSAGE = 'Anda mendapat pesanan baru dari PartBank.'
