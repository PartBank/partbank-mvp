import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { STATUS_LABELS, type OrderStatus } from '@/lib/utils/status'

export interface TimelineEvent {
  id: string
  to_status: OrderStatus
  notes: string | null
  created_at: string
}

interface StatusTimelineProps {
  events: TimelineEvent[]
  currentStatus: OrderStatus
}

export function StatusTimeline({ events, currentStatus }: StatusTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-text-muted">Belum ada riwayat status.</p>
  }

  return (
    <ol className="space-y-4">
      {events.map((event, i) => {
        const isCurrent = i === events.length - 1 && event.to_status === currentStatus
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'h-3 w-3 rounded-full border-2 shrink-0 mt-1',
                  isCurrent ? 'bg-navy-900 border-navy-900' : 'bg-white border-border-strong'
                )}
              />
              {i < events.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-1">
              <p className={cn('text-sm', isCurrent ? 'font-medium text-text-primary' : 'text-text-secondary')}>
                {STATUS_LABELS[event.to_status]}
              </p>
              {event.notes && <p className="text-xs text-text-muted mt-0.5">{event.notes}</p>}
              <p className="text-xs text-text-muted mt-0.5">{formatDate(event.created_at)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
