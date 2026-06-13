import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'

interface Props {
  params: { brandId: string }
}

export default async function BrandPage({ params }: Props) {
  const supabase = await createClient()

  const [{ data: brand }, { data: models }] = await Promise.all([
    supabase.from('truck_brands').select('id, name').eq('id', params.brandId).single(),
    supabase
      .from('truck_models')
      .select('id, name, year_range, image_url, parts(id)')
      .eq('brand_id', params.brandId)
      .order('name'),
  ])

  if (!brand) notFound()

  return (
    <div className="px-8 pt-7 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-6">
        <Link href="/catalog" className="hover:text-navy-700 transition-colors">Catalog</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-primary font-medium">{brand.name}</span>
      </nav>

      <PageHeader title={brand.name} subtitle="Select a vehicle model to browse available parts." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models?.map((model) => {
          const partCount = Array.isArray(model.parts) ? model.parts.length : 0

          return (
            <Link
              key={model.id}
              href={`/catalog/${params.brandId}/${model.id}`}
              className="group bg-white rounded-xl border border-border overflow-hidden hover:border-navy-700/30 hover:shadow-md transition-all duration-200"
            >
              {/* Image */}
              <div className="relative aspect-video bg-surface-secondary overflow-hidden">
                {model.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={model.image_url}
                    alt={model.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Truck className="h-14 w-14 text-border" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary text-sm group-hover:text-navy-900 transition-colors truncate">
                    {model.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {partCount === 0 ? 'No parts yet' : `${partCount} part${partCount !== 1 ? 's' : ''} available`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-navy-700 transition-colors shrink-0" />
              </div>
            </Link>
          )
        })}

        {(!models || models.length === 0) && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <Truck className="h-10 w-10 text-border mb-3" />
            <p className="text-sm font-medium text-text-secondary">No models available yet</p>
            <p className="text-xs text-text-muted mt-1">Check back later or contact the PartBank team.</p>
          </div>
        )}
      </div>
    </div>
  )
}
