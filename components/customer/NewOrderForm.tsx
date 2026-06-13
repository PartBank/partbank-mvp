'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createOrder } from '@/lib/actions/create-order'

interface NewOrderFormProps {
  partId?: string
}

export function NewOrderForm({ partId }: NewOrderFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isCustom = !partId

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    if (partId) fd.set('partId', partId)
    const res = await createOrder(fd)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCustom && (
        <>
          <div className="space-y-2">
            <Label htmlFor="truckInfo">Merek & Model Truk <span className="text-red-500">*</span></Label>
            <Input
              id="truckInfo"
              name="truckInfo"
              placeholder="Contoh: Hino FM 260 JD 2018"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customPartName">Nama Part <span className="text-red-500">*</span></Label>
            <Input
              id="customPartName"
              name="customPartName"
              placeholder="Contoh: Tie Rod End Kiri"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customPartDescription">Deskripsi & Spesifikasi <span className="text-red-500">*</span></Label>
            <Textarea
              id="customPartDescription"
              name="customPartDescription"
              rows={4}
              placeholder="Jelaskan kondisi part, ukuran, fungsi, atau informasi lain yang membantu tim PartBank melakukan identifikasi."
              required
              disabled={loading}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="quantity">Jumlah Unit</Label>
        <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required disabled={loading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{isCustom ? 'Catatan Tambahan' : 'Catatan'}</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Kondisi truk, urgensi, informasi tambahan lainnya."
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">
          Foto / Dokumen Referensi{' '}
          <span className="text-text-muted font-normal">(opsional)</span>
        </Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/*,application/pdf"
          multiple
          disabled={loading}
        />
        <p className="text-xs text-text-muted">
          {isCustom
            ? 'Foto part asli atau dokumen teknis sangat membantu tim RE. Bisa lebih dari satu file.'
            : 'Bisa lebih dari satu file. Format: gambar atau PDF.'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white">
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...</>
        ) : (
          'Kirim Permintaan'
        )}
      </Button>
    </form>
  )
}
