import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type NavItem } from '@/components/shared/Sidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/workshop/dashboard', icon: 'LayoutDashboard' },
  { label: 'Orders', href: '/workshop/orders', icon: 'Package' },
]

export default async function WorkshopLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar
        role="workshop"
        navItems={NAV_ITEMS}
        fullName={profile?.full_name ?? undefined}
      />
      <main className="ml-[220px] min-h-screen bg-surface-secondary">
        {children}
      </main>
    </div>
  )
}
