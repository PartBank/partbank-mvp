import Link from 'next/link'
import { ChevronRight, PlusCircle, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('truck_brands')
    .select('id, name, logo_url, truck_models(id)')
    .order('name')

  return (
    <div className="px-8 pt-7 pb-10">
      <PageHeader title="Parts Catalog" subtitle="Select your truck brand to browse available parts." />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {brands?.map((brand) => {
          const modelCount = Array.isArray(brand.truck_models) ? brand.truck_models.length : 0

          return (
            <Link
              key={brand.id}
              href={`/catalog/${brand.id}`}
              className="group bg-white rounded-xl border border-border p-4 hover:border-navy-700/40 hover:shadow-sm transition-all flex items-center gap-3"
            >
              <div className="h-11 w-11 rounded-lg bg-surface-secondary border border-border flex items-center justify-center shrink-0 overflow-hidden">
                {brand.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo_url} alt={brand.name} className="h-full w-full object-contain p-1.5" />
                ) : (
                  <Truck className="h-5 w-5 text-text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-sm group-hover:text-navy-900 transition-colors truncate">
                  {brand.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {modelCount === 0 ? 'No models yet' : `${modelCount} model${modelCount !== 1 ? 's' : ''}`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-navy-700 transition-colors shrink-0" />
            </Link>
          )
        })}

        {(!brands || brands.length === 0) && (
          <p className="col-span-4 text-sm text-text-muted py-10 text-center">
            No brands available yet.
          </p>
        )}
      </div>

      <Link
        href="/orders/new"
        className="group flex items-center gap-4 bg-white rounded-xl border border-dashed border-border p-5 hover:border-navy-700/40 hover:bg-navy-50/40 transition-all"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary group-hover:bg-navy-100 transition-colors shrink-0">
          <PlusCircle className="h-5 w-5 text-text-muted group-hover:text-navy-700 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary text-sm group-hover:text-navy-900 transition-colors">
            Part not in the catalog?
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Submit a request — the PartBank RE team will identify and engineer it for you.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-navy-700 shrink-0 transition-colors" />
      </Link>
    </div>
  )
}
