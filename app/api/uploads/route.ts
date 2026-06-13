import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFile, type StorageBucket } from '@/lib/supabase/storage'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FileType } from '@/lib/types/database.types'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
const BUCKETS: StorageBucket[] = ['receipts', 'drawings', 'references']
const FILE_TYPES = ['re_receipt', 'part_receipt', 'drawing', 'reference_photo']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ path: null, error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  const bucket = String(form.get('bucket') ?? '') as StorageBucket
  const orderId = String(form.get('orderId') ?? '')
  const fileType = String(form.get('fileType') ?? '')

  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ path: null, error: 'Invalid file.' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ path: null, error: 'File size exceeds 10MB.' }, { status: 400 })
  if (!ALLOWED.includes(file.type))
    return NextResponse.json({ path: null, error: 'File must be an image or PDF.' }, { status: 400 })
  if (!BUCKETS.includes(bucket))
    return NextResponse.json({ path: null, error: 'Invalid bucket.' }, { status: 400 })
  if (!orderId || !FILE_TYPES.includes(fileType))
    return NextResponse.json({ path: null, error: 'Incomplete metadata.' }, { status: 400 })

  const path = `${orderId}/${fileType}/${Date.now()}-${file.name}`
  const { path: stored, error } = await uploadFile({ bucket, path, file, contentType: file.type })
  if (error || !stored) return NextResponse.json({ path: null, error }, { status: 500 })

  const admin = createAdminClient()
  await admin.from('files').insert({
    order_id: orderId,
    uploader_id: user.id,
    file_type: fileType as FileType,
    storage_path: stored,
  })

  return NextResponse.json({ path: stored, error: null })
}
