import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type StorageBucket = 'receipts' | 'drawings' | 'references' | 'brand-logos' | 'model-images'

interface UploadArgs {
  bucket: StorageBucket
  path: string
  file: File | ArrayBuffer | Uint8Array
  contentType?: string
}

// All storage operations use the service-role client so authorized actions
// (uploads on behalf of a user, signed-URL generation) work regardless of
// the per-object RLS, after the caller has been authorized in code.
export async function uploadFile({
  bucket,
  path,
  file,
  contentType,
}: UploadArgs): Promise<{ path: string | null; error: string | null }> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType })
    if (error) return { path: null, error: error.message }
    return { path: data.path, error: null }
  } catch (e) {
    return { path: null, error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

export async function getSignedUrl({
  bucket,
  path,
  expiresIn = 3600,
}: {
  bucket: StorageBucket
  path: string
  expiresIn?: number
}): Promise<{ url: string | null; error: string | null }> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn)
    if (error) return { url: null, error: error.message }
    return { url: data.signedUrl, error: null }
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Failed to create URL' }
  }
}

export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const admin = createAdminClient()
  const { data } = admin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFile({
  bucket,
  path,
}: {
  bucket: StorageBucket
  path: string
}): Promise<{ error: string | null }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.storage.from(bucket).remove([path])
    return { error: error ? error.message : null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete file' }
  }
}
