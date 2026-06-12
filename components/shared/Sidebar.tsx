'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, LayoutDashboard, LogOut, Package, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/shared/NotificationBell'

type Role = 'customer' | 'workshop' | 'internal'

// Icons are resolved here (client side). Server Components cannot pass
// function components (Lucide icons) across the server/client boundary,
// so layouts pass the icon name as a string instead.
const ICONS = {
  BookOpen,
  Package,
  LayoutDashboard,
  Wrench,
} as const

export type IconName = keyof typeof ICONS

export interface NavItem {
  label: string
  href: string
  icon: IconName
}

interface SidebarProps {
  role: Role
  navItems: NavItem[]
  fullName?: string
}

const ROLE_LABELS: Record<Role, string> = {
  internal: 'Internal',
  workshop: 'Bengkel',
  customer: 'Buyer',
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}

export function Sidebar({ role, navItems, fullName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-navy-950 flex flex-col z-40">
      {/* Header */}
      <div className="bg-navy-900 px-4 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white p-1 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PartBank" className="h-full w-full object-contain" />
          </span>
          <p className="text-white font-semibold text-lg tracking-tight">PartBank</p>
        </div>
        <p className="text-white/60 text-xs mt-1.5">{ROLE_LABELS[role]}</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon]
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-white text-navy-900 font-medium'
                  : 'text-white/70 hover:bg-navy-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 px-3 py-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-navy-800 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-medium">
              {getInitials(fullName)}
            </span>
          </div>

          {/* Name */}
          <p className="text-white/70 text-xs truncate flex-1 min-w-0">
            {fullName ?? 'User'}
          </p>

          {/* Notification bell */}
          <NotificationBell role={role} />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors w-full px-1"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  )
}
