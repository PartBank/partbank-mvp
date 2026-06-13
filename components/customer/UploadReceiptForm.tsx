'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadReceipt } from '@/lib/actions/orders'
import { formatFileSize } from '@/lib/utils/format'

interface UploadReceiptFormProps {
  orderId: string
  fileType: 're_receipt' | 'part_receipt'
}

export function UploadReceiptForm({ orderId, fileType }: UploadReceiptFormProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please select a receipt file.')
      return
    }
    setLoading(true)
    setError('')
    const fd = new FormData()
    fd.append('orderId', orderId)
    fd.append('fileType', fileType)
    fd.append('file', file)
    const res = await uploadReceipt(fd)
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setDone(true)
    router.refresh()
  }

  if (done) {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
        Receipt uploaded. Awaiting confirmation from PartBank.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong bg-surface-secondary px-4 py-5 text-center hover:bg-surface-tertiary transition-colors"
      >
        <span className="text-sm text-text-secondary">
          {file ? file.name : 'Select transfer receipt (image/PDF)'}
        </span>
        {file && <span className="text-xs text-text-muted">{formatFileSize(file.size)}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          setError('')
          setFile(e.target.files?.[0] ?? null)
        }}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-navy-900 hover:bg-navy-800 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
          </>
        ) : (
          'Upload Transfer Receipt'
        )}
      </Button>
    </form>
  )
}
