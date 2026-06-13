'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatFileSize } from '@/lib/utils/format'
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
  linkOrderToPart,
  confirmReFee,
  confirmReReceipt,
  submitDrawing,
  confirmPartPayment,
  assignWorkshop,
  qcPass,
  qcFail,
  markRefunded,
  markCompleted,
} from '@/lib/actions/orders'
import { formatCurrency } from '@/lib/utils'
import type { OrderStatus } from '@/lib/utils/status'

const LINKABLE_STATUSES: OrderStatus[] = [
  'pending_re_confirmation',
  'pending_re_payment',
  'pending_re_receipt',
  're_in_progress',
  'pending_price_estimation',
  'pending_part_payment',
  'finding_workshop',
]

interface WorkshopOption {
  id: string
  name: string
  capability_tags: string[]
}

interface CatalogPart {
  id: string
  label: string
}

interface OrderActionPanelProps {
  orderId: string
  status: OrderStatus
  linkedPartName: string | null
  priceReference?: number | null
  catalogParts: CatalogPart[]
  workshops: WorkshopOption[]
  existingDrawingCount: number
  partHasDrawing: boolean
  duplicateReOrderCount: number
}

export function OrderActionPanel({
  orderId, status, linkedPartName, priceReference, catalogParts, workshops,
  existingDrawingCount, partHasDrawing, duplicateReOrderCount,
}: OrderActionPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const partLinked = linkedPartName !== null

  // part linking
  const [linkPartId, setLinkPartId] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [relinking, setRelinking] = useState(false)

  async function handleLinkPart() {
    if (!linkPartId) return
    setLinkLoading(true)
    setError('')
    const res = await linkOrderToPart(orderId, linkPartId)
    setLinkLoading(false)
    if (res.error) { setError(res.error); return }
    setRelinking(false)
    router.refresh()
  }

  const drawingInputRef = useRef<HTMLInputElement>(null)

  // field state
  const [reFee, setReFee] = useState('')
  const [partPrice, setPartPrice] = useState('')
  const [drawings, setDrawings] = useState<File[]>([])
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

  const showLinkUI = LINKABLE_STATUSES.includes(status)

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {showLinkUI && (
        partLinked && !relinking ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-xs text-green-800">
              <span className="font-medium">Linked:</span> {linkedPartName}
            </span>
            <button
              onClick={() => setRelinking(true)}
              className="text-xs text-green-700 underline hover:no-underline shrink-0"
            >
              Change
            </button>
          </div>
        ) : (
          <LinkPartSection
            catalogParts={catalogParts}
            value={linkPartId}
            onChange={setLinkPartId}
            onLink={handleLinkPart}
            onCancel={relinking ? () => setRelinking(false) : undefined}
            loading={linkLoading}
          />
        )
      )}

      {status === 'pending_re_confirmation' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reFee">RE Fee (IDR)</Label>
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
            Confirm &amp; Send to Buyer
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
          Confirm RE Payment
        </Button>
      )}

      {status === 're_in_progress' && (
        <div className="space-y-3">
          {duplicateReOrderCount > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold">Heads up:</span> {duplicateReOrderCount} other order{duplicateReOrderCount !== 1 ? 's are' : ' is'} in RE for this same part. Completing RE here will auto-advance {duplicateReOrderCount !== 1 ? 'them' : 'it'} to workshop assignment.
            </div>
          )}

          {partHasDrawing && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <span className="font-semibold">Drawing exists</span> — this part was RE&apos;d previously. Upload a new revision or proceed as-is.
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Technical Drawing
              {existingDrawingCount === 0 && !partHasDrawing && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>

            {existingDrawingCount > 0 && drawings.length === 0 && (
              <p className="text-xs text-text-muted">
                {existingDrawingCount} drawing{existingDrawingCount !== 1 ? 's' : ''} already uploaded — add more or proceed.
              </p>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => drawingInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-secondary px-4 py-4 text-center hover:bg-surface-tertiary transition-colors disabled:opacity-50"
            >
              <UploadCloud className="h-5 w-5 text-text-muted" />
              <span className="text-xs text-text-secondary">
                Click to select files
              </span>
              <span className="text-[11px] text-text-muted">PDF or image, multiple allowed</span>
            </button>
            <input
              ref={drawingInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? [])
                setDrawings((prev) => {
                  const names = new Set(prev.map((f) => f.name))
                  return [...prev, ...picked.filter((f) => !names.has(f.name))]
                })
                e.target.value = ''
              }}
            />

            {drawings.length > 0 && (
              <ul className="space-y-1.5">
                {drawings.map((f, i) => (
                  <li key={f.name} className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="flex-1 truncate text-text-primary">{f.name}</span>
                    <span className="text-text-muted shrink-0">{formatFileSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => setDrawings((prev) => prev.filter((_, j) => j !== i))}
                      className="text-text-muted hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            className="w-full bg-navy-900 hover:bg-navy-800 text-white"
            disabled={loading || (existingDrawingCount === 0 && !partHasDrawing && drawings.length === 0)}
            onClick={() =>
              run(() => {
                const fd = new FormData()
                fd.append('orderId', orderId)
                drawings.forEach((f) => fd.append('file', f))
                return submitDrawing(fd)
              })
            }
          >
            {loading && spinner}
            Done — Find Workshop
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
          Confirm Part Payment
        </Button>
      )}

      {status === 'finding_workshop' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Select Workshop</Label>
            <Select value={workshopId} onValueChange={setWorkshopId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a verified workshop" />
              </SelectTrigger>
              <SelectContent>
                {workshops.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No verified workshops available
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
          <div className="space-y-2">
            <Label htmlFor="workshopPrice">
              Customer Price (IDR)
              {priceReference != null && (
                <span className="ml-2 text-xs text-text-muted font-normal">
                  Ref: {formatCurrency(priceReference)}
                </span>
              )}
            </Label>
            <Input
              id="workshopPrice"
              type="number"
              min={0}
              value={partPrice}
              onChange={(e) => setPartPrice(e.target.value)}
              placeholder={priceReference ? String(priceReference) : '850000'}
              disabled={loading}
            />
          </div>
          <Button
            className="w-full bg-navy-900 hover:bg-navy-800 text-white"
            disabled={loading || !workshopId || !partPrice}
            onClick={() => run(() => assignWorkshop(orderId, workshopId, Number(partPrice)))}
          >
            {loading && spinner}
            Assign &amp; Quote Buyer
          </Button>
        </div>
      )}

      {status === 'pending_qc' && (
        <div className="space-y-2">
          {/* QC Pass */}
          <Dialog open={qcPassOpen} onOpenChange={setQcPassOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">QC Pass ✓</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>QC Passed — Enter Tracking Number</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="tracking">Tracking Number</Label>
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
                  Confirm QC Pass
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* QC Fail */}
          <Dialog open={qcFailOpen} onOpenChange={setQcFailOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50">
                QC Fail ✗
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>QC Failed — Failure Notes</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="qcNotes">Failure Notes</Label>
                <Textarea
                  id="qcNotes"
                  rows={4}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Explain why the part failed QC..."
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
                  Confirm QC Failure
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
          Refund Processed
        </Button>
      )}

      {status === 'in_delivery' && (
        <Button
          className="w-full bg-navy-900 hover:bg-navy-800 text-white"
          disabled={loading}
          onClick={() => run(() => markCompleted(orderId))}
        >
          {loading && spinner}
          Confirm Order Complete
        </Button>
      )}

      {(status === 'completed' || status === 'cancelled_refunded') && (
        <p className="text-sm text-text-muted">
          {status === 'completed' ? 'Order is complete.' : 'Order cancelled and refunded.'}
        </p>
      )}

      {(status === 'pending_re_payment' ||
        status === 'pending_price_estimation' ||
        status === 'pending_part_payment' ||
        status === 'in_production') && (
        <p className="text-sm text-text-muted">
          Awaiting action from buyer or workshop. No internal action required at this time.
        </p>
      )}
    </div>
  )
}

interface LinkPartSectionProps {
  catalogParts: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  onLink: () => void
  onCancel?: () => void
  loading: boolean
}

function LinkPartSection({ catalogParts, value, onChange, onLink, onCancel, loading }: LinkPartSectionProps) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-amber-800">
          {onCancel ? 'Change linked part' : 'Link to catalog part — RE is complete, identify the part'}
        </p>
        {onCancel && (
          <button onClick={onCancel} className="text-xs text-amber-700 underline hover:no-underline">
            Cancel
          </button>
        )}
      </div>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="Select a part from catalog…" />
        </SelectTrigger>
        <SelectContent>
          {catalogParts.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className="w-full bg-navy-900 hover:bg-navy-800 text-white"
        disabled={loading || !value}
        onClick={onLink}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {onCancel ? 'Update Link' : 'Link Part'}
      </Button>
    </div>
  )
}
