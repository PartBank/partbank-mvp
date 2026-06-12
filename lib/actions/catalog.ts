'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ManufacturabilityGrade, UserRole } from '@/lib/types/database.types'

type Result = { error: string | null }

async function requireInternal() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Tidak terautentikasi.' as const }
  const role = user.user_metadata?.role as UserRole | undefined
  if (role !== 'internal') return { supabase, error: 'Akses ditolak.' as const }
  return { supabase, error: null }
}

function done() {
  revalidatePath('/internal/catalog')
  revalidatePath('/catalog')
}

// ---- Create ----
export async function createBrand(name: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  if (!name.trim()) return { error: 'Nama merek wajib diisi.' }
  const { error: e } = await supabase.from('truck_brands').insert({ name: name.trim() })
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function createModel(
  brandId: string,
  name: string,
  yearRange: string
): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  if (!brandId) return { error: 'Pilih merek.' }
  if (!name.trim()) return { error: 'Nama model wajib diisi.' }
  const { error: e } = await supabase
    .from('truck_models')
    .insert({ brand_id: brandId, name: name.trim(), year_range: yearRange.trim() || null })
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function createCategory(modelId: string, name: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  if (!modelId) return { error: 'Pilih model.' }
  if (!name.trim()) return { error: 'Nama kategori wajib diisi.' }
  const { error: e } = await supabase
    .from('part_categories')
    .insert({ model_id: modelId, name: name.trim() })
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function createPart(input: {
  categoryId: string
  name: string
  description: string
  materialSpec: string
  grade: ManufacturabilityGrade | ''
  notes: string
}): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  if (!input.categoryId) return { error: 'Pilih kategori.' }
  if (!input.name.trim()) return { error: 'Nama part wajib diisi.' }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error: e } = await supabase.from('parts').insert({
    category_id: input.categoryId,
    name: input.name.trim(),
    description: input.description.trim() || null,
    material_spec: input.materialSpec.trim() || null,
    manufacturability_grade: input.grade || null,
    notes: input.notes.trim() || null,
    status: 'request_only',
    created_by: user?.id ?? null,
  })
  if (e) return { error: e.message }
  done()
  return { error: null }
}

// ---- Delete (with dependency checks) ----
export async function deleteBrand(id: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { count } = await supabase
    .from('truck_models')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', id)
  if ((count ?? 0) > 0)
    return { error: `Merek ini memiliki ${count} model. Hapus model terlebih dahulu.` }
  const { error: e } = await supabase.from('truck_brands').delete().eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function deleteModel(id: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { count } = await supabase
    .from('part_categories')
    .select('id', { count: 'exact', head: true })
    .eq('model_id', id)
  if ((count ?? 0) > 0)
    return { error: `Model ini memiliki ${count} kategori. Hapus kategori terlebih dahulu.` }
  const { error: e } = await supabase.from('truck_models').delete().eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function deleteCategory(id: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { count } = await supabase
    .from('parts')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
  if ((count ?? 0) > 0)
    return { error: `Kategori ini memiliki ${count} part. Hapus part terlebih dahulu.` }
  const { error: e } = await supabase.from('part_categories').delete().eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function deletePart(id: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('part_id', id)
  if ((count ?? 0) > 0)
    return { error: `Part ini terkait dengan ${count} order dan tidak dapat dihapus.` }
  const { error: e } = await supabase.from('parts').delete().eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}
