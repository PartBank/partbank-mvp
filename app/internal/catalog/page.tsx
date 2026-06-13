import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { CatalogManager } from '@/components/internal/CatalogManager'

export const metadata: Metadata = { title: 'PartBank — Catalog Management' }

export default async function InternalCatalogPage() {
  const supabase = await createClient()

  const [{ data: brands }, { data: models }, { data: categories }, { data: parts }] =
    await Promise.all([
      supabase.from('truck_brands').select('id, name, logo_url').order('name'),
      supabase.from('truck_models').select('id, name, year_range, brand_id, image_url').order('name'),
      supabase.from('part_categories').select('id, name').order('name'),
      supabase.from('parts').select('id, name, manufacturability_grade, category_id, model_id, drawing_url, price_reference').order('name'),
    ])

  return (
    <div className="px-8 pt-7 pb-10">
      <PageHeader title="Catalog Management" subtitle="Manage brands, models, categories, and parts" />
      <CatalogManager
        brands={brands ?? []}
        models={models ?? []}
        categories={categories ?? []}
        parts={parts ?? []}
      />
    </div>
  )
}
