import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WorkshopApprovalButtons } from '@/components/internal/WorkshopApprovalButtons'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'PartBank — Manajemen Bengkel' }

const TABS = [
  { key: 'pending', label: 'Menunggu Persetujuan' },
  { key: 'active', label: 'Aktif' },
  { key: 'all', label: 'Semua' },
] as const

interface Props {
  searchParams: { tab?: string }
}

export default async function WorkshopsPage({ searchParams }: Props) {
  const filter = searchParams.tab ?? 'pending'
  const supabase = await createClient()

  const { data: workshops } = await supabase
    .from('workshops')
    .select('id, name, capability_tags, tier, is_verified, created_at')
    .order('created_at', { ascending: false })

  const filtered = (workshops ?? []).filter((w) => {
    if (filter === 'pending') return !w.is_verified
    if (filter === 'active') return w.is_verified
    return true
  })

  return (
    <div>
      <PageHeader title="Manajemen Bengkel" subtitle="Verifikasi dan kelola bengkel mitra" />
      <div className="p-6 space-y-4">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/internal/workshops?tab=${t.key}`}
              className={cn(
                'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                filter === t.key
                  ? 'border-navy-900 text-navy-900 font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Bengkel</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead className="w-24">Tier</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-32">Daftar</TableHead>
                  <TableHead className="w-48 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium text-text-primary">{w.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(w.capability_tags ?? []).map((tag) => (
                          <Badge key={tag} className="border-0 bg-navy-50 text-navy-700 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">{w.tier}</TableCell>
                    <TableCell>
                      {w.is_verified ? (
                        <Badge className="border-0 bg-green-100 text-green-800 text-xs">Aktif</Badge>
                      ) : (
                        <Badge className="border-0 bg-amber-50 text-amber-700 text-xs">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {formatDate(w.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {w.is_verified ? (
                        <Link href={`/internal/workshops/${w.id}`}>
                          <Button variant="outline" size="sm">
                            Lihat Detail
                          </Button>
                        </Link>
                      ) : (
                        <WorkshopApprovalButtons workshopId={w.id} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="Tidak ada bengkel pada filter ini" />
        )}
      </div>
    </div>
  )
}
