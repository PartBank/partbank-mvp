import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS, type OrderStatus } from '@/lib/utils/status'

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        'border-0 font-medium text-xs px-2.5 py-0.5',
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
