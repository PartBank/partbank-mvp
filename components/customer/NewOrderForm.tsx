'use client'

import { useRef, useState } from 'react'
import { Loader2, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createOrder } from '@/lib/actions/create-order'

interface NewOrderFormProps {
  partId?: string
  isKnown?: boolean
}

function Section({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 text-white text-[10px] font-bold shrink-0">
        {number}
      </span>
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">{title}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export function NewOrderForm({ partId, isKnown = false }: NewOrderFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isCustom = !partId

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    if (partId) fd.set('partId', partId)
    files.forEach((f) => fd.append('photo', f))
    const res = await createOrder(fd)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  const MAX_FILES = 5
  const MAX_SIZE_MB = 5
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const oversized = selected.filter((f) => f.size > MAX_SIZE_BYTES)
    if (oversized.length > 0) {
      setError(`Each file must be under ${MAX_SIZE_MB}MB. Remove: ${oversized.map((f) => f.name).join(', ')}`)
      e.target.value = ''
      return
    }
    const combined = [...files, ...selected]
    if (combined.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed.`)
      e.target.value = ''
      return
    }
    setError('')
    setFiles(combined)
    e.target.value = ''
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-xl border border-border-strong divide-y divide-border">

        {/* Truck info — custom only */}
        {isCustom && (
          <div className="p-6">
            <Section number="01" title="Truck Information" />
            <div className="space-y-1.5">
              <Label htmlFor="truckInfo" className="text-xs font-medium text-text-secondary">
                Brand &amp; model <span className="text-red-500">*</span>
              </Label>
              <Input
                id="truckInfo"
                name="truckInfo"
                placeholder="e.g. Hino FM 260 JD 2018"
                required
                disabled={loading}
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}

        {/* Part details — custom only */}
        {isCustom && (
          <div className="p-6 space-y-4">
            <Section number="02" title="Part Details" />
            <div className="space-y-1.5">
              <Label htmlFor="customPartName" className="text-xs font-medium text-text-secondary">
                Part name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customPartName"
                name="customPartName"
                placeholder="e.g. Left Tie Rod End"
                required
                disabled={loading}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customPartDescription" className="text-xs font-medium text-text-secondary">
                Description &amp; specs <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="customPartDescription"
                name="customPartDescription"
                rows={4}
                placeholder="Describe the part condition, dimensions, function, or any details that will help the RE team identify it."
                required
                disabled={loading}
                className="text-sm resize-none"
              />
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="p-6 space-y-4">
          <Section number={isCustom ? '03' : '01'} title="Order Details" />

          <div className="space-y-1.5">
            <Label htmlFor="quantity" className="text-xs font-medium text-text-secondary">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              required
              disabled={loading}
              className="h-9 text-sm w-28"
            />
          </div>

          {/* File upload — only for RE/custom orders */}
          {!isKnown && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-secondary">
                Reference photos / documents{' '}
                <span className="text-text-muted font-normal">(optional)</span>
              </Label>

              <div
                className="rounded-lg border border-dashed border-border-strong bg-surface-secondary px-4 py-4 cursor-pointer hover:border-navy-700/50 hover:bg-navy-50/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center gap-3">
                  <Paperclip className="h-4 w-4 text-text-muted shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-text-secondary">
                      Click to attach files
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Images or PDFs · max {MAX_FILES} files · {MAX_SIZE_MB}MB each
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  disabled={loading}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <ul className="space-y-1.5 mt-2">
                  {files.map((file, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
                      <Paperclip className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <span className="text-xs text-text-secondary truncate flex-1">{file.name}</span>
                      <span className="text-[11px] text-text-muted shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-text-muted hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-text-secondary">
              Additional notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder={isKnown ? 'Urgency, delivery instructions, or anything else we should know.' : 'Urgency, truck condition, or anything else we should know.'}
              disabled={loading}
              className="text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-secondary rounded-b-xl flex items-center gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-navy-950 hover:bg-navy-900 text-white text-sm h-9 px-5 rounded-lg shrink-0"
          >
            {loading
              ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Submitting...</>
              : 'Submit Request'}
          </Button>
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : (
            <p className="text-xs text-text-muted">
              {isCustom
                ? 'The RE team will review and send you a quote.'
                : 'You will be notified once your order is confirmed.'}
            </p>
          )}
        </div>

      </div>
    </form>
  )
}
