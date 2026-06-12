import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-6">
      <div className="bg-white rounded-lg border border-border p-8 text-center max-w-sm w-full">
        <p className="text-3xl font-semibold text-navy-900">404</p>
        <p className="mt-2 text-sm font-medium text-text-primary">Halaman tidak ditemukan</p>
        <p className="mt-1 text-sm text-text-muted">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button className="bg-navy-900 hover:bg-navy-800 text-white">Kembali ke Beranda</Button>
        </Link>
      </div>
    </div>
  )
}
