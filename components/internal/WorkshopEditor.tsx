'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateWorkshopTags, updateWorkshopTier } from '@/lib/actions/workshops'
import type { WorkshopTier } from '@/lib/types/database.types'

interface Props {
  workshopId: string
  initialTags: string[]
  initialTier: WorkshopTier
}

export function WorkshopEditor({ workshopId, initialTags, initialTier }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState(initialTags.join(', '))
  const [tier, setTier] = useState<WorkshopTier>(initialTier)
  const [loading, setLoading] = useState<'tags' | 'tier' | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function saveTags() {
    setLoading('tags')
    setError('')
    setMsg('')
    const res = await updateWorkshopTags(
      workshopId,
      tags.split(',').map((t) => t.trim()).filter(Boolean)
    )
    setLoading(null)
    if (res.error) setError(res.error)
    else {
      setMsg('Capability tags saved.')
      router.refresh()
    }
  }

  async function saveTier(next: WorkshopTier) {
    setTier(next)
    setLoading('tier')
    setError('')
    setMsg('')
    const res = await updateWorkshopTier(workshopId, next)
    setLoading(null)
    if (res.error) setError(res.error)
    else {
      setMsg('Tier saved.')
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tags">Capability Tags (comma-separated)</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="machining, welding, casting"
            disabled={loading === 'tags'}
          />
          <Button
            className="bg-navy-900 hover:bg-navy-800 text-white shrink-0"
            disabled={loading === 'tags'}
            onClick={saveTags}
          >
            {loading === 'tags' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tier</Label>
        <Select value={tier} onValueChange={(v) => saveTier(v as WorkshopTier)} disabled={loading === 'tier'}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['Bronze', 'Silver', 'Platinum'] as const).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
