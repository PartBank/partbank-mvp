import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'

interface Props {
  params: { brandId: string }
}

export default async function BrandPage({ params }: Props) {
  const supabase = await createClient()

  const [{ data: brand }, { data: models }] = await Promise.all([
    supabase
      .from('truck_brands')
      .select('id, name')
      .eq('id', params.brandId)
      .single(),
    supabase
      .from('truck_models')
      .select('id, name, year_range')
      .eq('brand_id', params.brandId)
      .order('name'),
  ])

  if (!brand) notFound()

  return (
    <div>
      <PageHeader
        title={brand.name}
        subtitle="Pilih model kendaraan"
      />
      <div className="p-6">
        <Link
          href="/catalog"
          className="text-sm text-navy-700 hover:underline inline-flex items-center gap-1 mb-6"
        >
          ← Semua Merek
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models?.map((model) => (
            <Link
              key={model.id}
              href={`/catalog/${params.brandId}/${model.id}`}
              className="bg-white rounded-lg border border-border p-5 hover:shadow-sm transition-shadow cursor-pointer group"
            >
              <p className="font-medium text-text-primary group-hover:text-navy-900">
                {model.name}
              </p>
              {model.year_range && (
                <p className="text-xs text-text-muted mt-0.5">{model.year_range}</p>
              )}
              <p className="text-sm text-navy-700 mt-2 flex items-center gap-1">
                Lihat part
                <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </Link>
          ))}

          {(!models || models.length === 0) && (
            <p className="col-span-3 text-sm text-text-muted py-8 text-center">
              Belum ada model tersedia.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
