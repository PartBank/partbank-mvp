import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ManufacturabilityGrade } from '@/lib/types/database.types'

interface Props {
  params: { brandId: string; modelId: string }
}

const GRADE_COLORS: Record<ManufacturabilityGrade, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-red-100 text-red-800',
}

const PART_STATUS_LABELS: Record<string, string> = {
  request_only: 'Request Only',
  ready_to_make: 'Ready to Make',
}

export default async function ModelPage({ params }: Props) {
  const supabase = await createClient()

  const [{ data: model }, { data: categories }] = await Promise.all([
    supabase
      .from('truck_models')
      .select('id, name, brand_id')
      .eq('id', params.modelId)
      .single(),
    supabase
      .from('part_categories')
      .select('id, name, parts(id, name, manufacturability_grade, status)')
      .eq('model_id', params.modelId)
      .order('name'),
  ])

  if (!model) notFound()

  return (
    <div>
      <PageHeader title={model.name} />
      <div className="p-6">
        <Link
          href={`/catalog/${params.brandId}`}
          className="text-sm text-navy-700 hover:underline inline-flex items-center gap-1 mb-6"
        >
          ← Kembali
        </Link>

        {categories && categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category.id}>
                <h2 className="text-base font-medium text-text-primary border-b border-border pb-2 mb-3">
                  {category.name}
                </h2>

                {category.parts && category.parts.length > 0 ? (
                  <div className="bg-white rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Part</TableHead>
                          <TableHead className="w-20">Grade</TableHead>
                          <TableHead className="w-36">Status</TableHead>
                          <TableHead className="w-36 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.parts.map((part) => (
                          <TableRow key={part.id}>
                            <TableCell className="font-medium text-text-primary">
                              {part.name}
                            </TableCell>
                            <TableCell>
                              {part.manufacturability_grade ? (
                                <Badge
                                  className={`border-0 text-xs ${GRADE_COLORS[part.manufacturability_grade as ManufacturabilityGrade]}`}
                                >
                                  {part.manufacturability_grade}
                                </Badge>
                              ) : (
                                <span className="text-text-muted text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-text-secondary">
                                {PART_STATUS_LABELS[part.status] ?? part.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                href={`/catalog/${params.brandId}/${params.modelId}/${part.id}`}
                                className="text-sm text-navy-700 hover:underline font-medium"
                              >
                                Request Part Ini
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Belum ada part di kategori ini.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted py-8 text-center">
            Belum ada kategori part untuk model ini.
          </p>
        )}
      </div>
    </div>
  )
}
