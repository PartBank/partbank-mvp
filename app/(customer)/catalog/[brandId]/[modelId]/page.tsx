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

  const [{ data: model }, { data: parts }] = await Promise.all([
    supabase
      .from('truck_models')
      .select('id, name, brand_id')
      .eq('id', params.modelId)
      .single(),
    supabase
      .from('parts')
      .select('id, name, manufacturability_grade, status, part_categories(id, name)')
      .eq('model_id', params.modelId)
      .order('name'),
  ])

  if (!model) notFound()

  // Group parts by category
  type PartRow = NonNullable<typeof parts>[number]
  const grouped = (parts ?? []).reduce<
    Record<string, { id: string; name: string; parts: PartRow[] }>
  >((acc, part) => {
    const cat = Array.isArray(part.part_categories)
      ? part.part_categories[0]
      : part.part_categories
    const catId = cat?.id ?? 'uncategorized'
    const catName = cat?.name ?? 'Tanpa Kategori'
    if (!acc[catId]) acc[catId] = { id: catId, name: catName, parts: [] }
    acc[catId].parts.push(part)
    return acc
  }, {})

  const groupedList = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name))

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

        {groupedList.length > 0 ? (
          <div className="space-y-8">
            {groupedList.map((category) => (
              <div key={category.id}>
                <h2 className="text-base font-medium text-text-primary border-b border-border pb-2 mb-3">
                  {category.name}
                </h2>
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted py-8 text-center">
            Belum ada part untuk model ini.
          </p>
        )}
      </div>
    </div>
  )
}
