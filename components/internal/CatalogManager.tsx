'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  createBrand,
  createModel,
  createCategory,
  createPart,
  deleteBrand,
  deleteModel,
  deleteCategory,
  deletePart,
} from '@/lib/actions/catalog'
import type { ManufacturabilityGrade } from '@/lib/types/database.types'

interface Brand { id: string; name: string }
interface Model { id: string; name: string; year_range: string | null; brand_id: string }
interface Category { id: string; name: string }
interface Part {
  id: string
  name: string
  manufacturability_grade: ManufacturabilityGrade | null
  category_id: string
  model_id: string
}

interface Props {
  brands: Brand[]
  models: Model[]
  categories: Category[]
  parts: Part[]
}

type Tab = 'brands' | 'models' | 'categories' | 'parts'
const TABS: { key: Tab; label: string }[] = [
  { key: 'brands', label: 'Merek' },
  { key: 'models', label: 'Model' },
  { key: 'categories', label: 'Kategori' },
  { key: 'parts', label: 'Part' },
]

export function CatalogManager({ brands, models, categories, parts }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('brands')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [yearRange, setYearRange] = useState('')
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [materialSpec, setMaterialSpec] = useState('')
  const [grade, setGrade] = useState<ManufacturabilityGrade | ''>('')
  const [notes, setNotes] = useState('')

  const brandName = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands])
  const modelLabel = useMemo(
    () => new Map(models.map((m) => [m.id, `${brandName.get(m.brand_id) ?? '?'} › ${m.name}`])),
    [models, brandName]
  )
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  function resetForm() {
    setName('')
    setYearRange('')
    setBrandId('')
    setModelId('')
    setCategoryId('')
    setDescription('')
    setMaterialSpec('')
    setGrade('')
    setNotes('')
    setError('')
  }

  function openAdd() {
    resetForm()
    setOpen(true)
  }

  async function run(fn: () => Promise<{ error: string | null }>, closeOnSuccess = true) {
    setLoading(true)
    setError('')
    const res = await fn()
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    if (closeOnSuccess) setOpen(false)
    router.refresh()
  }

  async function submitAdd() {
    if (tab === 'brands') return run(() => createBrand(name))
    if (tab === 'models') return run(() => createModel(brandId, name, yearRange))
    if (tab === 'categories') return run(() => createCategory(name))
    return run(() => createPart({ categoryId, modelId, name, description, materialSpec, grade, notes }))
  }

  const addLabel =
    tab === 'brands' ? 'Tambah Merek'
    : tab === 'models' ? 'Tambah Model'
    : tab === 'categories' ? 'Tambah Kategori'
    : 'Tambah Part'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-border flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                tab === t.key
                  ? 'border-navy-900 text-navy-900 font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button className="bg-navy-900 hover:bg-navy-800 text-white ml-4" onClick={openAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
        <Table>
          {tab === 'brands' && (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Merek</TableHead>
                  <TableHead className="w-24">Model</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-text-primary">{b.name}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {models.filter((m) => m.brand_id === b.id).length}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton loading={loading} onDelete={() => run(() => deleteBrand(b.id), false)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {tab === 'models' && (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Merek</TableHead>
                  <TableHead className="w-32">Tahun</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-text-primary">{m.name}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{brandName.get(m.brand_id)}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{m.year_range ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <DeleteButton loading={loading} onDelete={() => run(() => deleteModel(m.id), false)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {tab === 'categories' && (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead className="w-24">Part</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-text-primary">{c.name}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {parts.filter((p) => p.category_id === c.id).length}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton loading={loading} onDelete={() => run(() => deleteCategory(c.id), false)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {tab === 'parts' && (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Part</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="w-20">Grade</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-text-primary">{p.name}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {modelLabel.get(p.model_id) ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {categoryName.get(p.category_id) ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {p.manufacturability_grade ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton loading={loading} onDelete={() => run(() => deletePart(p.id), false)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tab === 'models' && (
              <div className="space-y-2">
                <Label>Merek</Label>
                <Select value={brandId} onValueChange={setBrandId} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="Pilih merek" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tab === 'parts' && (
              <>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={modelId} onValueChange={setModelId} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder="Pilih model" /></SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{modelLabel.get(m.id)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="cat-name">
                {tab === 'brands' ? 'Nama Merek'
                  : tab === 'models' ? 'Nama Model'
                  : tab === 'categories' ? 'Nama Kategori'
                  : 'Nama Part'}
              </Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>

            {tab === 'models' && (
              <div className="space-y-2">
                <Label htmlFor="year">Tahun (opsional)</Label>
                <Input id="year" value={yearRange} onChange={(e) => setYearRange(e.target.value)} placeholder="2015–2023" disabled={loading} />
              </div>
            )}

            {tab === 'parts' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="desc">Deskripsi</Label>
                  <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mat">Spesifikasi Material</Label>
                  <Input id="mat" value={materialSpec} onChange={(e) => setMaterialSpec(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturability Grade</Label>
                  <Select value={grade} onValueChange={(v) => setGrade(v as ManufacturabilityGrade)} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder="Pilih grade" /></SelectTrigger>
                    <SelectContent>
                      {(['A', 'B', 'C', 'D'] as const).map((g) => (
                        <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pnotes">Catatan</Label>
                  <Textarea id="pnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={loading} />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button className="bg-navy-900 hover:bg-navy-800 text-white" disabled={loading} onClick={submitAdd}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DeleteButton({ loading, onDelete }: { loading: boolean; onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="text-text-muted hover:text-red-600 transition-colors disabled:opacity-50"
      aria-label="Hapus"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
