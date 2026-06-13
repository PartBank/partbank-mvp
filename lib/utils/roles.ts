export type Role = 'customer' | 'workshop' | 'internal'

export const ROLE_LABELS: Record<Role, string> = {
  internal: 'Internal',
  workshop: 'Workshop',
  customer: 'Buyer',
}

export const ROLE_COLORS: Record<Role, {
  pill: string
  activeBar: string
  activeBg: string
  activeText: string
  hover: string
  iconColor: string
  labelColor: string
}> = {
  internal: {
    pill:       'bg-navy-50 text-navy-700',
    activeBar:  'bg-navy-700',
    activeBg:   'bg-surface-secondary',
    activeText: 'text-text-primary',
    hover:      'hover:border-navy-400 hover:bg-navy-50',
    iconColor:  'text-navy-600',
    labelColor: 'text-navy-700',
  },
  workshop: {
    pill:       'bg-amber-50 text-amber-700',
    activeBar:  'bg-amber-500',
    activeBg:   'bg-surface-secondary',
    activeText: 'text-text-primary',
    hover:      'hover:border-amber-400 hover:bg-amber-50',
    iconColor:  'text-amber-600',
    labelColor: 'text-amber-700',
  },
  customer: {
    pill:       'bg-teal-50 text-teal-600',
    activeBar:  'bg-teal-500',
    activeBg:   'bg-surface-secondary',
    activeText: 'text-text-primary',
    hover:      'hover:border-teal-400 hover:bg-teal-50',
    iconColor:  'text-teal-600',
    labelColor: 'text-teal-700',
  },
}
