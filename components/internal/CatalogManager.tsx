'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ColumnDef,
  type SortingState,
  type Column,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
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
  updateBrand,
  createModel,
  createCategory,
  createPart,
  deleteBrand,
  deleteModel,
  deleteCategory,
  deletePart,
  uploadBrandLogo,
  removeBrandLogo,
  uploadModelImage,
  removeModelImage,
  updatePartDetails,
  uploadPartDrawing,
} from '@/lib/actions/catalog'
import { formatCurrency } from '@/lib/utils'
import type { ManufacturabilityGrade } from '@/lib/types/database.types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Brand { id: string; name: string; logo_url: string | null }
interface Model { id: string; name: string; year_range: string | null; brand_id: string; image_url: string | null }
interface Category { id: string; name: string }
interface Part {
  id: string
  name: string
  manufacturability_grade: ManufacturabilityGrade | null
  category_id: string
  model_id: string
  drawing_url: string | null
  price_reference: number | null
}

interface Props {
  brands: Brand[]
  models: Model[]
  categories: Category[]
  parts: Part[]
}

type Tab = 'brands' | 'models' | 'categories' | 'parts'
const TABS: { key: Tab; label: string }[] = [
  { key: 'brands', label: 'Brands' },
  { key: 'models', label: 'Models' },
  { key: 'categories', label: 'Categories' },
  { key: 'parts', label: 'Parts' },
]

const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }

// ─── Component ───────────────────────────────────────────────────────────────

export function CatalogManager({ brands, models, categories, parts }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('brands')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoUploading, setLogoUploading] = useState<string | null>(null)

  // Part edit dialog
  const [editPart, setEditPart] = useState<Part | null>(null)
  const [editPriceRef, setEditPriceRef] = useState('')
  const [partEditLoading, setPartEditLoading] = useState(false)
  const [partEditError, setPartEditError] = useState('')
  const [drawingUploading, setDrawingUploading] = useState(false)

  // Brand edit dialog
  const [editBrand, setEditBrand] = useState<Brand | null>(null)
  const [editName, setEditName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState('')
  const [logoError, setLogoError] = useState('')

  // Model edit dialog
  const [editModel, setEditModel] = useState<Model | null>(null)
  const [modelImageUploading, setModelImageUploading] = useState(false)
  const [modelImageError, setModelImageError] = useState('')

  // Add form fields
  const [name, setName] = useState('')
  const [yearRange, setYearRange] = useState('')
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [materialSpec, setMaterialSpec] = useState('')
  const [grade, setGrade] = useState<ManufacturabilityGrade | ''>('')
  const [notes, setNotes] = useState('')

  // Parts table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Derived lookup maps
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

  const run = useCallback(async (fn: () => Promise<{ error: string | null }>, closeOnSuccess = true) => {
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
  }, [router])

  const openPartEdit = useCallback((part: Part) => {
    setEditPart(part)
    setEditPriceRef(part.price_reference != null ? String(part.price_reference) : '')
    setPartEditError('')
  }, [])

  async function handleSavePartDetails() {
    if (!editPart) return
    setPartEditLoading(true)
    setPartEditError('')
    const price = editPriceRef.trim() ? Number(editPriceRef) : null
    const res = await updatePartDetails(editPart.id, price)
    setPartEditLoading(false)
    if (res.error) { setPartEditError(res.error); return }
    setEditPart((p) => p ? { ...p, price_reference: price } : null)
    router.refresh()
  }

  async function handleDrawingUpload(partId: string, file: File) {
    setDrawingUploading(true)
    setPartEditError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadPartDrawing(partId, fd)
    setDrawingUploading(false)
    if (res.error) { setPartEditError(res.error); return }
    setEditPart((p) => p ? { ...p, drawing_url: 'uploaded' } : null)
    router.refresh()
  }

  function openEdit(brand: Brand) {
    setEditBrand(brand)
    setEditName(brand.name)
    setNameError('')
    setLogoError('')
  }

  async function handleSaveName() {
    if (!editBrand) return
    setNameLoading(true)
    setNameError('')
    const res = await updateBrand(editBrand.id, editName)
    setNameLoading(false)
    if (res.error) { setNameError(res.error); return }
    setEditBrand((b) => b ? { ...b, name: editName.trim() } : null)
    router.refresh()
  }

  async function handleLogoUpload(brandId: string, file: File) {
    setLogoUploading(brandId)
    setLogoError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadBrandLogo(brandId, fd)
    setLogoUploading(null)
    if (res.error) { setLogoError(res.error); return }
    if (res.url) setEditBrand((b) => b ? { ...b, logo_url: res.url } : null)
    router.refresh()
  }

  async function handleRemoveLogo() {
    if (!editBrand) return
    setLogoError('')
    const res = await removeBrandLogo(editBrand.id)
    if (res.error) { setLogoError(res.error); return }
    setEditBrand((b) => b ? { ...b, logo_url: null } : null)
    router.refresh()
  }

  async function handleRemoveModelImage() {
    if (!editModel) return
    setModelImageError('')
    const res = await removeModelImage(editModel.id)
    if (res.error) { setModelImageError(res.error); return }
    setEditModel((m) => m ? { ...m, image_url: null } : null)
    router.refresh()
  }

  async function handleModelImageUpload(modelId: string, file: File) {
    setModelImageUploading(true)
    setModelImageError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadModelImage(modelId, fd)
    setModelImageUploading(false)
    if (res.error) { setModelImageError(res.error); return }
    if (res.url) setEditModel((m) => m ? { ...m, image_url: res.url! } : null)
    router.refresh()
  }

  async function submitAdd() {
    if (tab === 'brands') return run(() => createBrand(name))
    if (tab === 'models') return run(() => createModel(brandId, name, yearRange))
    if (tab === 'categories') return run(() => createCategory(name))
    return run(() => createPart({ categoryId, modelId, name, description, materialSpec, grade, notes }))
  }

  const addLabel =
    tab === 'brands' ? 'Add Brand'
    : tab === 'models' ? 'Add Model'
    : tab === 'categories' ? 'Add Category'
    : 'Add Part'

  // ─── Parts column definitions ─────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Part>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} label="Part Name" />,
      enableGlobalFilter: true,
    },
    {
      id: 'model',
      accessorFn: (row) => modelLabel.get(row.model_id) ?? '',
      header: ({ column }) => <SortableHeader column={column} label="Model" />,
      enableGlobalFilter: true,
    },
    {
      id: 'category',
      accessorFn: (row) => categoryName.get(row.category_id) ?? '',
      header: ({ column }) => <SortableHeader column={column} label="Category" />,
      enableGlobalFilter: true,
    },
    {
      accessorKey: 'manufacturability_grade',
      header: ({ column }) => <SortableHeader column={column} label="Grade" />,
      cell: ({ row }) => {
        const g = row.original.manufacturability_grade
        return g
          ? <span className="text-sm font-medium text-text-secondary">{g}</span>
          : <span className="text-text-muted text-sm">—</span>
      },
      sortingFn: (rowA, rowB) => {
        const a = GRADE_ORDER[rowA.original.manufacturability_grade ?? ''] ?? 9
        const b = GRADE_ORDER[rowB.original.manufacturability_grade ?? ''] ?? 9
        return a - b
      },
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'price_reference',
      header: ({ column }) => <SortableHeader column={column} label="Ref Price" />,
      cell: ({ row }) => row.original.price_reference != null
        ? <span className="text-sm text-text-secondary">{formatCurrency(row.original.price_reference)}</span>
        : <span className="text-text-muted text-sm">—</span>,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.price_reference ?? Infinity
        const b = rowB.original.price_reference ?? Infinity
        return a - b
      },
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'drawing_url',
      header: ({ column }) => <SortableHeader column={column} label="Drawing" />,
      cell: ({ row }) => row.original.drawing_url
        ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">✓ Ready</span>
        : <span className="text-text-muted text-sm">—</span>,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.drawing_url ? 1 : 0
        const b = rowB.original.drawing_url ? 1 : 0
        return a - b
      },
      enableGlobalFilter: false,
    },
    {
      id: 'actions',
      enableSorting: false,
      enableGlobalFilter: false,
      header: () => null,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openPartEdit(p)}
              className="text-text-muted hover:text-navy-700 transition-colors"
              aria-label="Edit part"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <DeleteButton loading={loading} onDelete={() => run(() => deletePart(p.id), false)} />
          </div>
        )
      },
    },
  ], [modelLabel, categoryName, openPartEdit, run, loading])

  const table = useReactTable({
    data: parts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  })

  // Column width classes for the parts table
  const COL_WIDTHS: Record<string, string> = {
    model: 'w-52',
    category: 'w-36',
    manufacturability_grade: 'w-[76px]',
    price_reference: 'w-32',
    drawing_url: 'w-24',
    actions: 'w-20',
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-border flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setGlobalFilter('')
              }}
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

      {tab === 'parts' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search by part name, model, or category…"
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-border overflow-hidden overflow-x-auto">
        <Table>

          {/* ── Brands ── */}
          {tab === 'brands' && (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Logo</TableHead>
                  <TableHead className="w-64">Brand Name</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="py-2.5">
                      <div className="h-7 w-7 rounded-md bg-surface-secondary border border-border flex items-center justify-center overflow-hidden">
                        {b.logo_url
                          ? <img src={b.logo_url} alt={b.name} className="h-full w-full object-contain p-0.5" />
                          : <Truck className="h-3 w-3 text-text-muted" />
                        }
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 font-medium text-text-primary">{b.name}</TableCell>
                    <TableCell className="py-2.5">
                      {(() => {
                        const count = models.filter((m) => m.brand_id === b.id).length
                        return count > 0
                          ? <span className="inline-flex items-center rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary">{count} model{count !== 1 ? 's' : ''}</span>
                          : <span className="text-xs text-text-muted">—</span>
                      })()}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(b)}
                          className="text-text-muted hover:text-navy-700 transition-colors"
                          aria-label="Edit brand"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <DeleteButton
                          loading={loading}
                          onDelete={() => run(() => deleteBrand(b.id), false)}
                          disabledReason={models.some((m) => m.brand_id === b.id) ? 'Remove all models first' : undefined}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {/* ── Models ── */}
          {tab === 'models' && (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Photo</TableHead>
                  <TableHead className="w-48">Model</TableHead>
                  <TableHead className="w-44">Brand</TableHead>
                  <TableHead>Parts</TableHead>
                  <TableHead className="w-32">Year</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="py-2.5">
                      <div className="h-7 w-7 rounded-md bg-surface-secondary border border-border flex items-center justify-center overflow-hidden">
                        {m.image_url
                          ? <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                          : <Truck className="h-3 w-3 text-text-muted" />
                        }
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 font-medium text-text-primary">{m.name}</TableCell>
                    <TableCell className="py-2.5 text-sm text-text-secondary">{brandName.get(m.brand_id)}</TableCell>
                    <TableCell className="py-2.5">
                      {(() => {
                        const count = parts.filter((p) => p.model_id === m.id).length
                        return count > 0
                          ? <span className="inline-flex items-center rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary">{count} part{count !== 1 ? 's' : ''}</span>
                          : <span className="text-xs text-text-muted">—</span>
                      })()}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-text-secondary">{m.year_range ?? '—'}</TableCell>
                    <TableCell className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditModel(m); setModelImageError('') }}
                          className="text-text-muted hover:text-navy-700 transition-colors"
                          aria-label="Edit model"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <DeleteButton
                          loading={loading}
                          onDelete={() => run(() => deleteModel(m.id), false)}
                          disabledReason={parts.some((p) => p.model_id === m.id) ? 'Remove all parts first' : undefined}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {/* ── Categories ── */}
          {tab === 'categories' && (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Category Name</TableHead>
                  <TableHead>Parts</TableHead>
                  <TableHead className="w-20 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="py-2.5 font-medium text-text-primary">{c.name}</TableCell>
                    <TableCell className="py-2.5">
                      {(() => {
                        const count = parts.filter((p) => p.category_id === c.id).length
                        return count > 0
                          ? <span className="inline-flex items-center rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary">{count} part{count !== 1 ? 's' : ''}</span>
                          : <span className="text-xs text-text-muted">—</span>
                      })()}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <DeleteButton
                        loading={loading}
                        onDelete={() => run(() => deleteCategory(c.id), false)}
                        disabledReason={parts.some((p) => p.category_id === c.id) ? 'Remove all parts first' : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}

          {/* ── Parts (TanStack Table) ── */}
          {tab === 'parts' && (
            <>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className={COL_WIDTHS[header.id] ?? ''}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-text-muted">
                      {globalFilter ? `No parts match "${globalFilter}"` : 'No parts yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </>
          )}

        </Table>
      </div>

      {/* ── Add dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tab === 'models' && (
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={brandId} onValueChange={setBrandId} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{modelLabel.get(m.id)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
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
                {tab === 'brands' ? 'Brand Name'
                  : tab === 'models' ? 'Model Name'
                  : tab === 'categories' ? 'Category Name'
                  : 'Part Name'}
              </Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>

            {tab === 'models' && (
              <div className="space-y-2">
                <Label htmlFor="year">Year range (optional)</Label>
                <Input id="year" value={yearRange} onChange={(e) => setYearRange(e.target.value)} placeholder="2015–2023" disabled={loading} />
              </div>
            )}

            {tab === 'parts' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mat">Material Specs</Label>
                  <Input id="mat" value={materialSpec} onChange={(e) => setMaterialSpec(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturability Grade</Label>
                  <Select value={grade} onValueChange={(v) => setGrade(v as ManufacturabilityGrade)} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {(['A', 'B', 'C', 'D'] as const).map((g) => (
                        <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pnotes">Notes</Label>
                  <Textarea id="pnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={loading} />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button className="bg-navy-900 hover:bg-navy-800 text-white" disabled={loading} onClick={submitAdd}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Part edit dialog ── */}
      <Dialog open={editPart !== null} onOpenChange={(o) => { if (!o) setEditPart(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Part — {editPart?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-price-ref">
                Reference Price (IDR)
                <span className="ml-1.5 text-[11px] text-text-muted font-normal">internal only</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="edit-price-ref"
                  type="number"
                  min={0}
                  value={editPriceRef}
                  onChange={(e) => setEditPriceRef(e.target.value)}
                  placeholder="850000"
                  disabled={partEditLoading}
                  className="flex-1"
                />
                <Button
                  className="bg-navy-900 hover:bg-navy-800 text-white shrink-0"
                  disabled={partEditLoading}
                  onClick={handleSavePartDetails}
                >
                  {partEditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Technical Drawing</Label>
              <div className="flex items-center gap-3">
                <div className={`rounded-md border px-3 py-2 text-xs ${editPart?.drawing_url ? 'border-green-200 bg-green-50 text-green-700' : 'border-border bg-surface-secondary text-text-muted'}`}>
                  {editPart?.drawing_url ? '✓ Drawing uploaded' : 'No drawing yet'}
                </div>
                {editPart && (
                  <DrawingUploadButton
                    uploading={drawingUploading}
                    onFile={(file) => handleDrawingUpload(editPart.id, file)}
                  />
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                PDF or image — once uploaded, new orders for this part skip RE entirely.
              </p>
            </div>

            {partEditError && <p className="text-sm text-red-600">{partEditError}</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Model edit dialog ── */}
      <Dialog open={editModel !== null} onOpenChange={(o) => { if (!o) setEditModel(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Model — {editModel?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Model Photo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-28 shrink-0">
                  <div className="h-20 w-28 rounded-xl bg-surface-secondary border border-border flex items-center justify-center overflow-hidden">
                    {editModel?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editModel.image_url} alt={editModel.name} className="h-full w-full object-cover" />
                    ) : (
                      <Truck className="h-8 w-8 text-text-muted" />
                    )}
                  </div>
                  {editModel?.image_url && (
                    <button
                      type="button"
                      onClick={handleRemoveModelImage}
                      className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted mb-2">PNG, JPEG, or WebP — max 5MB</p>
                  {editModel && (
                    <ModelImageButton
                      hasImage={!!editModel.image_url}
                      uploading={modelImageUploading}
                      onFile={(file) => handleModelImageUpload(editModel.id, file)}
                    />
                  )}
                </div>
              </div>
              {modelImageError && <p className="text-sm text-red-600">{modelImageError}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Brand edit dialog ── */}
      <Dialog open={editBrand !== null} onOpenChange={(o) => { if (!o) setEditBrand(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-brand-name">Brand Name</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-brand-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={nameLoading}
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName() }}
                />
                <Button
                  className="bg-navy-900 hover:bg-navy-800 text-white shrink-0"
                  disabled={nameLoading || !editName.trim()}
                  onClick={handleSaveName}
                >
                  {nameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
              {nameError && <p className="text-sm text-red-600">{nameError}</p>}
            </div>

            <div className="space-y-2">
              <Label>Brand Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <div className="h-16 w-16 rounded-xl bg-surface-secondary border border-border flex items-center justify-center overflow-hidden">
                    {editBrand?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editBrand.logo_url} alt={editBrand.name} className="h-full w-full object-contain p-2" />
                    ) : (
                      <Truck className="h-7 w-7 text-text-muted" />
                    )}
                  </div>
                  {editBrand?.logo_url && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-text-muted hover:text-red-500 transition-colors"
                      aria-label="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted mb-2">PNG, JPEG, WebP or SVG — max 2MB</p>
                  {editBrand && (
                    <BrandLogoButton
                      hasImage={!!editBrand.logo_url}
                      uploading={logoUploading === editBrand.id}
                      onFile={(file) => handleLogoUpload(editBrand.id, file)}
                    />
                  )}
                </div>
              </div>
              {logoError && <p className="text-sm text-red-600">{logoError}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortableHeader({ column, label }: { column: Column<Part, unknown>; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-1 -mx-1 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors group"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted group-hover:text-text-primary transition-colors">
        {label}
      </span>
      {sorted === 'asc' ? (
        <ArrowUp className="h-3 w-3 text-navy-700 shrink-0" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3 w-3 text-navy-700 shrink-0" />
      ) : (
        <ArrowUpDown className="h-3 w-3 text-text-muted opacity-40 group-hover:opacity-60 shrink-0 transition-opacity" />
      )}
    </button>
  )
}

function DeleteButton({
  loading,
  onDelete,
  disabledReason,
}: {
  loading: boolean
  onDelete: () => void
  disabledReason?: string
}) {
  const isDisabled = loading || !!disabledReason
  return (
    <button
      onClick={onDelete}
      disabled={isDisabled}
      title={disabledReason}
      className="text-text-muted hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-muted"
      aria-label="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function DrawingUploadButton({ uploading, onFile }: { uploading: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : 'Upload drawing'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </>
  )
}

function ModelImageButton({ hasImage, uploading, onFile }: { hasImage: boolean; uploading: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : hasImage ? 'Replace photo' : 'Upload photo'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </>
  )
}

function BrandLogoButton({
  hasImage,
  uploading,
  onFile,
}: {
  hasImage: boolean
  uploading: boolean
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : hasImage ? 'Replace logo' : 'Upload logo'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </>
  )
}
