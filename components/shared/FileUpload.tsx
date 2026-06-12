'use client'

import { useRef, useState } from 'react'
import { Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/utils/format'
import type { StorageBucket } from '@/lib/supabase/storage'

const MAX_SIZE = 10 * 1024 * 1024

interface FileUploadProps {
  orderId: string
  bucket: StorageBucket
  fileType: 're_receipt' | 'part_receipt' | 'drawing' | 'reference_photo'
  onSuccess?: (path: string) => void
  label?: string
  accept?: string
}

export function FileUpload({
  orderId,
  bucket,
  fileType,
  onSuccess,
  label = 'Pilih file',
  accept = 'image/*,application/pdf',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  function pick(f: File | null) {
    setError('')
    setDone(false)
    if (f && f.size > MAX_SIZE) {
      setError('Ukuran file melebihi 10MB.')
      setFile(null)
      return
    }
    setFile(f)
  }

  async function upload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', bucket)
      fd.append('orderId', orderId)
      fd.append('fileType', fileType)
      const res = await fetch('/api/uploads', { method: 'POST', body: fd })
      const data = (await res.json()) as { path: string | null; error: string | null }
      if (!res.ok || data.error || !data.path) {
        setError(data.error ?? 'Upload gagal.')
        return
      }
      setDone(true)
      onSuccess?.(data.path)
    } catch {
      setError('Terjadi kesalahan saat upload.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-secondary px-4 py-6 text-center hover:bg-surface-tertiary transition-colors"
      >
        <UploadCloud className="h-6 w-6 text-text-muted" />
        <span className="text-sm text-text-secondary">{file ? file.name : label}</span>
        {file && <span className="text-xs text-text-muted">{formatFileSize(file.size)}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-green-600">Berhasil diupload.</p>}

      {file && !done && (
        <Button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="w-full bg-navy-900 hover:bg-navy-800 text-white"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengupload...
            </>
          ) : (
            'Upload'
          )}
        </Button>
      )}
    </div>
  )
}
