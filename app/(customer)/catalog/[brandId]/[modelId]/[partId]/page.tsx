import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ChevronRight, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

interface Props {
  params: { brandId: string; modelId: string; partId: string }
}

export default async function PartDetailPage({ params }: Props) {
  const supabase = await createClient()

  const [{ data: part }, { data: model }, { data: brand }] = await Promise.all([
    supabase
      .from('parts')
      .select('id, name, description, status, material_spec, notes, drawing_url, manufacturability_grade, part_categories(name)')
      .eq('id', params.partId)
      .single(),
    supabase.from('truck_models').select('id, name').eq('id', params.modelId).single(),
    supabase.from('truck_brands').select('id, name').eq('id', params.brandId).single(),
  ])

  if (!part) notFound()

  const category = (Array.isArray(part.part_categories) ? part.part_categories[0] : part.part_categories) as { name: string } | null
  const isGradeD = part.manufacturability_grade === 'D'
  const isKnown = !!part.drawing_url

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
        <Link href={`/catalog/${params.brandId}/${params.modelId}`} className="hover:text-navy-700 transition-colors">
          {model?.name ?? '—'}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-text-primary font-medium truncate max-w-[180px]">{part.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Part details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-border p-6 space-y-5">
            <div>
              {category?.name && (
                <p className="text-xs font-medium text-text-muted mb-1">{category.name}</p>
              )}
              <h1 className="text-lg font-semibold text-text-primary">{part.name}</h1>
            </div>

            {isKnown && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1">
                <Zap className="h-3 w-3" />
                Ready to produce
              </div>
            )}

            {part.description && (
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-1.5">Description</p>
                <p className="text-sm text-text-secondary leading-relaxed">{part.description}</p>
              </div>
            )}

            {part.material_spec && (
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-1.5">Material Specs</p>
                <p className="text-sm text-text-secondary">{part.material_spec}</p>
              </div>
            )}

            {part.notes && (
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-1.5">Notes</p>
                <p className="text-sm text-text-secondary">{part.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order card */}
        <div className="lg:col-span-1">
          {isGradeD ? (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Cannot be ordered online</p>
                  <p className="text-sm text-red-700 mt-1 leading-relaxed">
                    This is a safety-critical component. Please contact us directly to discuss certification requirements.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border overflow-hidden sticky top-6">
              {/* Header */}
              <div className={`px-5 py-3.5 border-b ${isKnown ? 'bg-green-50 border-green-100' : 'bg-surface-secondary border-border'}`}>
                <p className="text-sm font-semibold text-text-primary">Order This Part</p>
                {isKnown ? (
                  <p className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Ready to produce
                  </p>
                ) : (
                  <p className="text-xs text-text-muted mt-0.5">Custom manufacture</p>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {isKnown
                    ? "Place your order and we'll assign a workshop to manufacture and deliver."
                    : "We'll perform reverse engineering first, then manufacture and deliver to you."}
                </p>

                {!isKnown && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                    <p className="text-xs font-medium text-amber-800">Includes Reverse Engineering</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      A small RE fee is required. You&apos;ll approve the cost before proceeding.
                    </p>
                  </div>
                )}

                <Link href={`/orders/new?partId=${part.id}`} className="block pt-1">
                  <Button className="w-full bg-navy-950 hover:bg-navy-900 text-white text-sm h-10">
                    Request This Part
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
