import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import type { PartStatus } from '@/lib/types/database.types'

interface Props {
  params: { brandId: string; modelId: string }
}

const STATUS_BADGE: Record<PartStatus, { label: string; className: string }> = {
  ready_to_make: { label: 'Ready to Order', className: 'bg-green-50 text-green-700 border border-green-200' },
  request_only:  { label: 'Request Only',   className: 'bg-amber-50 text-amber-700 border border-amber-200' },
}

export default async function ModelPage({ params }: Props) {
  const supabase = await createClient()

  const [{ data: brand }, { data: model }, { data: parts }] = await Promise.all([
    supabase.from('truck_brands').select('id, name').eq('id', params.brandId).single(),
    supabase.from('truck_models').select('id, name').eq('id', params.modelId).single(),
    supabase
      .from('parts')
      .select('id, name, description, status, part_categories(id, name)')
      .eq('model_id', params.modelId)
      .order('name'),
  ])

  if (!model) notFound()

  type PartRow = NonNullable<typeof parts>[number]
  const grouped = (parts ?? []).reduce<Record<string, { id: string; name: string; parts: PartRow[] }>>(
    (acc, part) => {
      const cat = Array.isArray(part.part_categories) ? part.part_categories[0] : part.part_categories
      const catId = cat?.id ?? 'uncategorized'
      const catName = cat?.name ?? 'Uncategorized'
      if (!acc[catId]) acc[catId] = { id: catId, name: catName, parts: [] }
      acc[catId].parts.push(part)
      return acc
    },
    {}
  )

  const groupedList = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="px-8 pt-7 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-6 flex-wrap">
        <Link href="/catalog" className="hover:text-navy-700 transition-colors">Catalog</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href={`/catalog/${params.brandId}`} className="hover:text-navy-700 transition-colors">
          {brand?.name ?? '—'}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-text-primary font-medium">{model.name}</span>
      </nav>

      <PageHeader
        title={model.name}
        subtitle={`${parts?.length ?? 0} part${(parts?.length ?? 0) !== 1 ? 's' : ''} available`}
      />

      {groupedList.length > 0 ? (
        <div className="space-y-6">
          {groupedList.map((category) => (
            <div key={category.id}>
              <h2 className="text-sm font-semibold text-text-secondary mb-3">
                {category.name}
              </h2>
              <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
                {category.parts.map((part) => {
                  const status = (part.status ?? 'request_only') as PartStatus
                  const badge = STATUS_BADGE[status]
                  return (
                    <Link
                      key={part.id}
                      href={`/catalog/${params.brandId}/${params.modelId}/${part.id}`}
                      className="flex items-center gap-4 px-4 py-4 hover:bg-surface-secondary transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary group-hover:text-navy-900 transition-colors">
                          {part.name}
                        </p>
                        {part.description && (
                          <p className="text-xs text-text-muted mt-0.5 truncate">
                            {part.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-navy-700 transition-colors" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-text-muted">No parts available for this model yet.</p>
          <Link
            href="/orders/new"
            className="inline-block mt-3 text-sm text-navy-700 hover:underline font-medium"
          >
            Submit a custom request →
          </Link>
        </div>
      )}
    </div>
  )
}
