export const STATUS_COLORS = {
  pending_re_confirmation:      'bg-slate-100 text-slate-700',
  pending_re_payment:           'bg-amber-50 text-amber-700',
  pending_re_receipt:           'bg-amber-50 text-amber-700',
  re_in_progress:               'bg-blue-50 text-blue-700',
  pending_price_estimation:     'bg-blue-50 text-blue-700',
  pending_part_payment:         'bg-amber-50 text-amber-700',
  pending_payment_confirmation: 'bg-amber-50 text-amber-700',
  finding_workshop:             'bg-purple-50 text-purple-700',
  in_production:                'bg-indigo-50 text-indigo-700',
  pending_qc:                   'bg-orange-50 text-orange-700',
  qc_failed_cancelled:          'bg-red-50 text-red-700',
  cancelled_refunded:           'bg-red-50 text-red-600',
  in_delivery:                  'bg-green-50 text-green-700',
  completed:                    'bg-green-100 text-green-800',
} as const

export type OrderStatus = keyof typeof STATUS_COLORS

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_re_confirmation:      'Menunggu Konfirmasi RE',
  pending_re_payment:           'Menunggu Pembayaran RE',
  pending_re_receipt:           'Menunggu Bukti Transfer RE',
  re_in_progress:               'RE Sedang Berjalan',
  pending_price_estimation:     'Menunggu Estimasi Harga',
  pending_part_payment:         'Menunggu Pembayaran Part',
  pending_payment_confirmation: 'Menunggu Konfirmasi Pembayaran',
  finding_workshop:             'Mencari Bengkel',
  in_production:                'Dalam Produksi',
  pending_qc:                   'Menunggu QC',
  qc_failed_cancelled:          'QC Gagal — Dibatalkan',
  cancelled_refunded:           'Dibatalkan — Refund Diproses',
  in_delivery:                  'Dalam Pengiriman',
  completed:                    'Selesai',
}
