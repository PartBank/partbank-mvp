'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { uploadFile, getPublicUrl } from '@/lib/supabase/storage'
import type { ManufacturabilityGrade, UserRole } from '@/lib/types/database.types'

type Result = { error: string | null }

async function requireInternal() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Not authenticated.' as const }
  const role = user.user_metadata?.role as UserRole | undefined
  if (role !== 'internal') return { supabase, error: 'Access denied.' as const }
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
  if (!name.trim()) return { error: 'Brand name is required.' }
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
  if (!brandId) return { error: 'Select a brand.' }
  if (!name.trim()) return { error: 'Model name is required.' }
  const { error: e } = await supabase
    .from('truck_models')
    .insert({ brand_id: brandId, name: name.trim(), year_range: yearRange.trim() || null })
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function createCategory(name: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  if (!name.trim()) return { error: 'Category name is required.' }
  const { error: e } = await supabase
    .from('part_categories')
    .insert({ name: name.trim() })
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function createPart(input: {
  categoryId: string
  modelId: string
  name: string
  description: string
  materialSpec: string
  grade: ManufacturabilityGrade | ''
  notes: string
}): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  if (!input.categoryId) return { error: 'Select a category.' }
  if (!input.modelId) return { error: 'Select a model.' }
  if (!input.name.trim()) return { error: 'Part name is required.' }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error: e } = await supabase.from('parts').insert({
    category_id: input.categoryId,
    model_id: input.modelId,
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

// ---- Update ----
export async function updateBrand(id: string, name: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  if (!name.trim()) return { error: 'Brand name is required.' }
  const { error: e } = await supabase
    .from('truck_brands')
    .update({ name: name.trim() })
    .eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

// ---- Brand logo ----
const LOGO_ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
const LOGO_MAX = 2 * 1024 * 1024 // 2MB

export async function uploadBrandLogo(brandId: string, formData: FormData): Promise<Result & { url: string | null }> {
  const { supabase, error } = await requireInternal()
  if (error) return { error, url: null }
  if (!brandId) return { error: 'Invalid brand.', url: null }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Invalid file.', url: null }
  if (file.size > LOGO_MAX) return { error: 'File size exceeds 2MB.', url: null }
  if (!LOGO_ALLOWED.includes(file.type)) return { error: 'File must be an image (PNG, JPEG, WebP, or SVG).', url: null }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${brandId}/logo.${ext}`

  const { path: stored, error: uploadError } = await uploadFile({
    bucket: 'brand-logos',
    path,
    file,
    contentType: file.type,
  })
  if (uploadError || !stored) return { error: uploadError ?? 'Upload failed.', url: null }

  const publicUrl = getPublicUrl('brand-logos', stored) + `?v=${Date.now()}`
  const { error: dbError } = await supabase
    .from('truck_brands')
    .update({ logo_url: publicUrl })
    .eq('id', brandId)
  if (dbError) return { error: dbError.message, url: null }

  done()
  return { error: null, url: publicUrl }
}

// ---- Remove images ----
export async function removeBrandLogo(brandId: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { error: e } = await supabase.from('truck_brands').update({ logo_url: null }).eq('id', brandId)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function removeModelImage(modelId: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { error: e } = await supabase.from('truck_models').update({ image_url: null }).eq('id', modelId)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

// ---- Model image ----
export async function uploadModelImage(modelId: string, formData: FormData): Promise<Result & { url: string | null }> {
  const { supabase, error } = await requireInternal()
  if (error) return { error, url: null }
  if (!modelId) return { error: 'Invalid model.', url: null }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Invalid file.', url: null }
  if (file.size > 5 * 1024 * 1024) return { error: 'File size exceeds 5MB.', url: null }
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type))
    return { error: 'File must be an image (PNG, JPEG, or WebP).', url: null }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${modelId}/image.${ext}`

  const { path: stored, error: uploadError } = await uploadFile({
    bucket: 'model-images',
    path,
    file,
    contentType: file.type,
  })
  if (uploadError || !stored) return { error: uploadError ?? 'Upload failed.', url: null }

  const publicUrl = getPublicUrl('model-images', stored) + `?v=${Date.now()}`
  const { error: dbError } = await supabase
    .from('truck_models')
    .update({ image_url: publicUrl })
    .eq('id', modelId)
  if (dbError) return { error: dbError.message, url: null }

  done()
  return { error: null, url: publicUrl }
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
    return { error: `This brand has ${count} model(s). Delete all models first.` }
  const { error: e } = await supabase.from('truck_brands').delete().eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function deleteModel(id: string): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { count } = await supabase
    .from('parts')
    .select('id', { count: 'exact', head: true })
    .eq('model_id', id)
  if ((count ?? 0) > 0)
    return { error: `This model has ${count} part(s). Delete all parts first.` }
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
    return { error: `This category has ${count} part(s). Delete all parts first.` }
  const { error: e } = await supabase.from('part_categories').delete().eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function updatePartDetails(
  partId: string,
  priceReference: number | null
): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const { error: e } = await supabase
    .from('parts')
    .update({ price_reference: priceReference })
    .eq('id', partId)
  if (e) return { error: e.message }
  done()
  return { error: null }
}

export async function uploadPartDrawing(partId: string, formData: FormData): Promise<Result> {
  const { supabase, error } = await requireInternal()
  if (error) return { error }
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'No file provided.' }
  const MAX = 10 * 1024 * 1024
  if (file.size > MAX) return { error: 'File exceeds 10MB.' }

  const path = `parts/${partId}/drawing`
  const { error: upErr } = await uploadFile({
    bucket: 'drawings',
    path,
    file,
    contentType: file.type,
  })
  if (upErr) return { error: `Upload failed: ${upErr}` }

  const { error: e } = await supabase.from('parts').update({ drawing_url: path }).eq('id', partId)
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
    return { error: `This part is linked to ${count} order(s) and cannot be deleted.` }
  const { error: e } = await supabase.from('parts').delete().eq('id', id)
  if (e) return { error: e.message }
  done()
  return { error: null }
}
