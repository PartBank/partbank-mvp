'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, LayoutDashboard, LogOut, Package, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { ROLE_COLORS, ROLE_LABELS, type Role } from '@/lib/utils/roles'

const ICONS = { BookOpen, Package, LayoutDashboard, Wrench } as const

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


function getInitials(name?: string): string {
  if (!name) return 'U'
  return name.split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase()
}

export function Sidebar({ role, navItems, fullName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const accent = ROLE_COLORS[role]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-border flex flex-col z-40">

      {/* Logo + role */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="PartBank" className="h-7 w-7 block shrink-0" />
          <p className="text-text-primary font-semibold text-sm tracking-tight">PartBank</p>
        </div>
        <span className={cn('mt-2.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', accent.pill)}>
          {ROLE_LABELS[role]}
        </span>
      </div>

      <div className="mx-3 h-px bg-border shrink-0" />

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
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
                'relative flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? `${accent.activeBg} ${accent.activeText}`
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              )}
            >
              {isActive && (
                <span className="absolute left-0 inset-y-0 flex items-center">
                  <span className={cn('w-[3px] h-4 rounded-r-full', accent.activeBar)} />
                </span>
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mx-3 h-px bg-border shrink-0" />

      {/* Bottom */}
      <div className="shrink-0 px-2 py-2.5 space-y-0.5">
        <NotificationBell role={role} sidebar />

        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-6 w-6 rounded-full bg-navy-50 border border-border flex items-center justify-center shrink-0">
            <span className="text-navy-700 text-[10px] font-semibold">{getInitials(fullName)}</span>
          </div>
          <p className="text-text-secondary text-xs truncate flex-1 min-w-0">{fullName ?? 'User'}</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>

    </aside>
  )
}
