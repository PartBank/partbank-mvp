import Link from 'next/link'
import { ChevronRight, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('truck_brands')
    .select('id, name')
    .order('name')

  return (
    <div>
      <PageHeader
        title="Katalog Part"
        subtitle="Pilih merek truk Anda"
      />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands?.map((brand) => (
            <Link
              key={brand.id}
              href={`/catalog/${brand.id}`}
              className="bg-white rounded-lg border border-border p-5 hover:shadow-sm transition-shadow cursor-pointer group"
            >
              <p className="font-medium text-text-primary group-hover:text-navy-900">
                {brand.name}
              </p>
              <p className="text-sm text-navy-700 mt-1 flex items-center gap-1">
                Lihat model
                <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </Link>
          ))}

          {(!brands || brands.length === 0) && (
            <p className="col-span-3 text-sm text-text-muted py-8 text-center">
              Belum ada merek tersedia.
            </p>
          )}
        </div>

        <Link
          href="/orders/new"
          className="mt-8 flex items-center gap-4 bg-white rounded-lg border border-dashed border-border p-5 hover:border-navy-700 hover:bg-navy-50 transition-colors group"
        >
          <PlusCircle className="h-8 w-8 text-text-muted group-hover:text-navy-700 shrink-0" />
          <div>
            <p className="font-medium text-text-primary group-hover:text-navy-900">
              Part tidak ada di katalog?
            </p>
            <p className="text-sm text-text-secondary mt-0.5">
              Kirim request — tim RE PartBank akan identifikasi dan buatkan gambar tekniknya.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-text-muted ml-auto group-hover:text-navy-700" />
        </Link>
      </div>
    </div>
  )
}
