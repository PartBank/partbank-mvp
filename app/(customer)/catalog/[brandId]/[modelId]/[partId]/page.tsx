import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ManufacturabilityGrade } from '@/lib/types/database.types'

interface Props {
  params: { brandId: string; modelId: string; partId: string }
}

const GRADE_COLORS: Record<ManufacturabilityGrade, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-red-100 text-red-800',
}

const GRADE_DESCRIPTIONS: Record<ManufacturabilityGrade, string> = {
  A: 'Dapat diproduksi dengan mudah menggunakan proses standar.',
  B: 'Dapat diproduksi dengan proses manufaktur standar.',
  C: 'Memerlukan proses khusus atau toleransi ketat.',
  D: 'Komponen kritis keselamatan — memerlukan sertifikasi khusus.',
}

export default async function PartDetailPage({ params }: Props) {
  const supabase = await createClient()

  const { data: part } = await supabase
    .from('parts')
    .select(`
      id, name, description, manufacturability_grade, status,
      material_spec, notes,
      part_categories (
        name,
        truck_models (
          name,
          truck_brands ( name )
        )
      )
    `)
    .eq('id', params.partId)
    .single()

  if (!part) notFound()

  const category = part.part_categories as {
    name: string
    truck_models: { name: string; truck_brands: { name: string } | null } | null
  } | null

  const grade = part.manufacturability_grade as ManufacturabilityGrade | null
  const isGradeD = grade === 'D'

  return (
    <div>
      <PageHeader
        title={part.name}
        subtitle={category?.name}
      />
      <div className="p-6">
        <Link
          href={`/catalog/${params.brandId}/${params.modelId}`}
          className="text-sm text-navy-700 hover:underline inline-flex items-center gap-1 mb-6"
        >
          ← Kembali ke daftar part
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Part details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-lg border border-border p-5 space-y-4">
              {/* Breadcrumb */}
              <p className="text-xs text-text-muted">
                {category?.truck_models?.truck_brands?.name ?? '—'}
                {' › '}
                {category?.truck_models?.name ?? '—'}
                {' › '}
                {category?.name ?? '—'}
              </p>

              {part.description && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                    Deskripsi
                  </p>
                  <p className="text-sm text-text-secondary">{part.description}</p>
                </div>
              )}

              {part.material_spec && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                    Spesifikasi Material
                  </p>
                  <p className="text-sm text-text-secondary">{part.material_spec}</p>
                </div>
              )}

              {part.notes && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                    Catatan
                  </p>
                  <p className="text-sm text-text-secondary">{part.notes}</p>
                </div>
              )}

              {grade && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                    Tingkat Manufakturabilitas
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 text-sm px-3 py-1 ${GRADE_COLORS[grade]}`}>
                      Grade {grade}
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      {GRADE_DESCRIPTIONS[grade]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order card */}
          <div className="lg:col-span-1">
            {isGradeD ? (
              <div className="bg-red-50 rounded-lg border border-red-200 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Part Tidak Dapat Dipesan
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Part ini adalah komponen kritis keselamatan dan tidak dapat
                      dipesan melalui platform.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-border p-5 space-y-4">
                <p className="text-base font-medium text-text-primary">Pesan Part Ini</p>

                <div>
                  <p className="text-xs text-text-muted mb-1.5">Status Part</p>
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm font-medium">
                    {part.status === 'request_only' ? 'Request Only' : 'Ready to Make'}
                  </span>
                </div>

                {part.status === 'request_only' && (
                  <p className="text-sm text-text-secondary">
                    Part ini belum pernah diproduksi. Tim PartBank akan melakukan
                    Reverse Engineering terlebih dahulu.
                  </p>
                )}

                <Link href={`/orders/new?partId=${part.id}`} className="block">
                  <Button className="w-full bg-navy-900 hover:bg-navy-800 text-white">
                    Request Part Ini
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
