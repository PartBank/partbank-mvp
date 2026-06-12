'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createOrder } from '@/lib/actions/create-order'

interface NewOrderFormProps {
  partId: string
}

export function NewOrderForm({ partId }: NewOrderFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('partId', partId)
    const res = await createOrder(fd)
    // On success createOrder redirects (throws), so we only reach here on error.
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="quantity">Jumlah Unit</Label>
        <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required disabled={loading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Deskripsi kondisi part, referensi ukuran, dll."
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">Foto Referensi (opsional)</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" disabled={loading} />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...
          </>
        ) : (
          'Kirim Permintaan'
        )}
      </Button>
    </form>
  )
}
