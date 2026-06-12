'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  confirmReFee,
  confirmReReceipt,
  submitDrawingAndPrice,
  confirmPartPayment,
  assignWorkshop,
  qcPass,
  qcFail,
  markRefunded,
  markCompleted,
} from '@/lib/actions/orders'
import type { OrderStatus } from '@/lib/utils/status'

interface WorkshopOption {
  id: string
  name: string
  capability_tags: string[]
}

interface OrderActionPanelProps {
  orderId: string
  status: OrderStatus
  workshops: WorkshopOption[]
}

export function OrderActionPanel({ orderId, status, workshops }: OrderActionPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // field state
  const [reFee, setReFee] = useState('')
  const [partPrice, setPartPrice] = useState('')
  const [leadTime, setLeadTime] = useState('')
  const [drawing, setDrawing] = useState<File | null>(null)
  const [workshopId, setWorkshopId] = useState('')
  const [tracking, setTracking] = useState('')
  const [qcNotes, setQcNotes] = useState('')
  const [qcPassOpen, setQcPassOpen] = useState(false)
  const [qcFailOpen, setQcFailOpen] = useState(false)

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

      {status === 'pending_re_confirmation' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reFee">Biaya RE (IDR)</Label>
            <Input
              id="reFee"
              type="number"
              min={0}
              value={reFee}
              onChange={(e) => setReFee(e.target.value)}
              placeholder="250000"
              disabled={loading}
            />
          </div>
          <Button
            className="w-full bg-navy-900 hover:bg-navy-800 text-white"
            disabled={loading}
            onClick={() => run(() => confirmReFee(orderId, Number(reFee)))}
          >
            {loading && spinner}
            Konfirmasi &amp; Kirim ke Buyer
          </Button>
        </div>
      )}

      {status === 'pending_re_receipt' && (
        <Button
          className="w-full bg-navy-900 hover:bg-navy-800 text-white"
          disabled={loading}
          onClick={() => run(() => confirmReReceipt(orderId))}
        >
          {loading && spinner}
          Konfirmasi Pembayaran RE
        </Button>
      )}

      {status === 're_in_progress' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="drawing">Gambar Teknik (PDF/gambar)</Label>
            <Input
              id="drawing"
              type="file"
              accept="image/*,application/pdf"
              disabled={loading}
              onChange={(e) => setDrawing(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partPrice">Estimasi Harga Part (IDR)</Label>
            <Input
              id="partPrice"
              type="number"
              min={0}
              value={partPrice}
              onChange={(e) => setPartPrice(e.target.value)}
              placeholder="850000"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadTime">Estimasi Waktu Pengerjaan</Label>
            <Input
              id="leadTime"
              value={leadTime}
              onChange={(e) => setLeadTime(e.target.value)}
              placeholder="5–7 hari kerja"
              disabled={loading}
            />
          </div>
          <Button
            className="w-full bg-navy-900 hover:bg-navy-800 text-white"
            disabled={loading}
            onClick={() =>
              run(() => {
                const fd = new FormData()
                fd.append('orderId', orderId)
                fd.append('partPrice', partPrice)
                fd.append('leadTime', leadTime)
                if (drawing) fd.append('file', drawing)
                return submitDrawingAndPrice(fd)
              })
            }
          >
            {loading && spinner}
            Upload &amp; Kirim Estimasi
          </Button>
        </div>
      )}

      {status === 'pending_payment_confirmation' && (
        <Button
          className="w-full bg-navy-900 hover:bg-navy-800 text-white"
          disabled={loading}
          onClick={() => run(() => confirmPartPayment(orderId))}
        >
          {loading && spinner}
          Konfirmasi Pembayaran Part
        </Button>
      )}

      {status === 'finding_workshop' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Pilih Bengkel</Label>
            <Select value={workshopId} onValueChange={setWorkshopId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih bengkel terverifikasi" />
              </SelectTrigger>
              <SelectContent>
                {workshops.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Tidak ada bengkel terverifikasi
                  </SelectItem>
                ) : (
                  workshops.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                      {w.capability_tags.length > 0 && ` — ${w.capability_tags.join(', ')}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full bg-navy-900 hover:bg-navy-800 text-white"
            disabled={loading || !workshopId}
            onClick={() => run(() => assignWorkshop(orderId, workshopId))}
          >
            {loading && spinner}
            Assign Bengkel
          </Button>
        </div>
      )}

      {status === 'pending_qc' && (
        <div className="space-y-2">
          {/* QC Pass */}
          <Dialog open={qcPassOpen} onOpenChange={setQcPassOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">QC Lolos ✓</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>QC Lolos — Input Nomor Resi</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="tracking">Nomor Resi</Label>
                <Input
                  id="tracking"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="JNE0123456789"
                  disabled={loading}
                />
              </div>
              <DialogFooter>
                <Button
                  className="bg-navy-900 hover:bg-navy-800 text-white"
                  disabled={loading}
                  onClick={async () => {
                    const ok = await run(() => qcPass(orderId, tracking))
                    if (ok) setQcPassOpen(false)
                  }}
                >
                  {loading && spinner}
                  Konfirmasi QC Lolos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* QC Fail */}
          <Dialog open={qcFailOpen} onOpenChange={setQcFailOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50">
                QC Gagal ✗
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>QC Gagal — Catatan Kegagalan</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="qcNotes">Catatan Kegagalan</Label>
                <Textarea
                  id="qcNotes"
                  rows={4}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Jelaskan alasan part gagal QC..."
                  disabled={loading}
                />
              </div>
              <DialogFooter>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={loading}
                  onClick={async () => {
                    const ok = await run(() => qcFail(orderId, qcNotes))
                    if (ok) setQcFailOpen(false)
                  }}
                >
                  {loading && spinner}
                  Konfirmasi QC Gagal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {status === 'qc_failed_cancelled' && (
        <Button
          className="w-full bg-navy-900 hover:bg-navy-800 text-white"
          disabled={loading}
          onClick={() => run(() => markRefunded(orderId))}
        >
          {loading && spinner}
          Refund Telah Diproses
        </Button>
      )}

      {status === 'in_delivery' && (
        <Button
          className="w-full bg-navy-900 hover:bg-navy-800 text-white"
          disabled={loading}
          onClick={() => run(() => markCompleted(orderId))}
        >
          {loading && spinner}
          Konfirmasi Order Selesai
        </Button>
      )}

      {(status === 'completed' || status === 'cancelled_refunded') && (
        <p className="text-sm text-text-muted">
          {status === 'completed' ? 'Order telah selesai.' : 'Order dibatalkan dan telah di-refund.'}
        </p>
      )}

      {(status === 'pending_re_payment' ||
        status === 'pending_part_payment' ||
        status === 'in_production' ||
        status === 'pending_price_estimation') && (
        <p className="text-sm text-text-muted">
          Menunggu aksi dari pihak lain (buyer / bengkel). Tidak ada aksi internal saat ini.
        </p>
      )}
    </div>
  )
}
