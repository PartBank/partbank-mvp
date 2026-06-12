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
import { approveWorkshop, rejectWorkshop } from '@/lib/actions/workshops'

export function WorkshopApprovalButtons({ workshopId }: { workshopId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)

  async function approve() {
    setLoading(true)
    setError('')
    const res = await approveWorkshop(workshopId)
    setLoading(false)
    if (res.error) setError(res.error)
    else router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        disabled={loading}
        onClick={approve}
      >
        {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Approve
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pendaftaran Bengkel</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Penolakan</Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              disabled={loading}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
              onClick={async () => {
                setLoading(true)
                setError('')
                const res = await rejectWorkshop(workshopId, reason)
                setLoading(false)
                if (res.error) setError(res.error)
                else {
                  setOpen(false)
                  router.refresh()
                }
              }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi Penolakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
