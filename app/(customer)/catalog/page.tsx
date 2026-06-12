import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
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
      </div>
    </div>
  )
}
