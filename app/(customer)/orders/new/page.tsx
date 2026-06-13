import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { NewOrderForm } from '@/components/customer/NewOrderForm'

export const metadata: Metadata = { title: 'PartBank — Buat Pesanan' }

interface Props {
  searchParams: { partId?: string }
}

export default async function NewOrderPage({ searchParams }: Props) {
  const partId = searchParams.partId

  // Custom part path — no partId needed
  if (!partId) {
    return (
      <div>
        <PageHeader
          title="Request Part Baru"
          subtitle="Part belum ada di katalog PartBank"
        />
        <div className="p-6 max-w-2xl">
          <Link
            href="/catalog"
            className="text-sm text-navy-700 hover:underline inline-flex items-center gap-1 mb-6"
          >
            ← Kembali ke katalog
          </Link>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-amber-800">Part tidak ada di katalog?</p>
            <p className="text-sm text-amber-700 mt-1">
              Tim RE PartBank akan mengidentifikasi dan membuat gambar teknik berdasarkan deskripsi dan foto yang kamu kirim. Proses ini memerlukan biaya Reverse Engineering.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border p-5">
            <NewOrderForm />
          </div>
        </div>
      </div>
    )
  }

  // Catalog part path — partId must be valid
  const supabase = await createClient()
  const { data: part } = await supabase
    .from('parts')
    .select('id, name, manufacturability_grade, part_categories(name)')
    .eq('id', partId)
    .single()

  if (!part) notFound()
  const category = Array.isArray(part.part_categories)
    ? part.part_categories[0]
    : part.part_categories

  return (
    <div>
      <PageHeader title="Buat Permintaan Part" subtitle={part.name} />
      <div className="p-6 max-w-2xl">
        <Link
          href="/catalog"
          className="text-sm text-navy-700 hover:underline inline-flex items-center gap-1 mb-6"
        >
          ← Kembali ke katalog
        </Link>

        <div className="bg-white rounded-lg border border-border p-5 mb-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Part yang diminta</p>
          <p className="text-base font-medium text-text-primary mt-1">{part.name}</p>
          {category?.name && <p className="text-sm text-text-secondary">{category.name}</p>}
        </div>

        <div className="bg-white rounded-lg border border-border p-5">
          <NewOrderForm partId={part.id} />
        </div>
      </div>
    </div>
  )
}
