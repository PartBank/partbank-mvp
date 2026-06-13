import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { CatalogManager } from '@/components/internal/CatalogManager'

export const metadata: Metadata = { title: 'PartBank — Manajemen Katalog' }

export default async function InternalCatalogPage() {
  const supabase = await createClient()

  const [{ data: brands }, { data: models }, { data: categories }, { data: parts }] =
    await Promise.all([
      supabase.from('truck_brands').select('id, name').order('name'),
      supabase.from('truck_models').select('id, name, year_range, brand_id').order('name'),
      supabase.from('part_categories').select('id, name').order('name'),
      supabase.from('parts').select('id, name, manufacturability_grade, category_id, model_id').order('name'),
    ])

  return (
    <div>
      <PageHeader title="Manajemen Katalog" subtitle="Kelola merek, model, kategori, dan part" />
      <div className="p-6">
        <CatalogManager
          brands={brands ?? []}
          models={models ?? []}
          categories={categories ?? []}
          parts={parts ?? []}
        />
      </div>
    </div>
  )
}
