'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  workshopAcceptOrder,
  workshopRejectOrder,
  workshopProductionComplete,
} from '@/lib/actions/orders'
import type { OrderStatus } from '@/lib/utils/status'

interface WorkshopActionPanelProps {
  orderId: string
  status: OrderStatus
  accepted: boolean
}

export function WorkshopActionPanel({ orderId, status, accepted }: WorkshopActionPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)

  async function run(fn: () => Promise<{ error: string | null }>) {
    setLoading(true)
    setError('')
    const res = await fn()
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return false
    }
    router.refresh()
    return true
  }

  const spinner = <Loader2 className="mr-2 h-4 w-4 animate-spin" />

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {status === 'in_production' && !accepted && (
        <div className="space-y-2">
          <Button
            className="w-full bg-navy-900 hover:bg-navy-800 text-white"
            disabled={loading}
            onClick={() => run(() => workshopAcceptOrder(orderId))}
          >
            {loading && spinner}
            Terima Pesanan ✓
          </Button>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50">
                Tolak Pesanan ✗
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tolak Pesanan — Alasan</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="reason">Alasan Penolakan</Label>
                <Textarea
                  id="reason"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan alasan menolak pesanan ini..."
                  disabled={loading}
                />
              </div>
              <DialogFooter>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={loading}
                  onClick={async () => {
                    const ok = await run(() => workshopRejectOrder(orderId, reason))
                    if (ok) setRejectOpen(false)
                  }}
                >
                  {loading && spinner}
                  Konfirmasi Penolakan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {status === 'in_production' && accepted && (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">Produksi sedang berlangsung.</p>
          <Button
            className="w-full bg-navy-900 hover:bg-navy-800 text-white"
            disabled={loading}
            onClick={() => run(() => workshopProductionComplete(orderId))}
          >
            {loading && spinner}
            Produksi Selesai — Kirim ke QC
          </Button>
        </div>
      )}

      {status === 'pending_qc' && (
        <p className="text-sm text-text-secondary">
          Part telah dikirim ke pusat QC PartBank. Menunggu hasil inspeksi.
        </p>
      )}

      {status === 'completed' && <p className="text-sm text-text-secondary">Pesanan selesai.</p>}

      {(status === 'qc_failed_cancelled' || status === 'cancelled_refunded') && (
        <p className="text-sm text-red-700">Part gagal QC. Order dibatalkan.</p>
      )}
    </div>
  )
}
