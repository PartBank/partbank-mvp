import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type NavItem } from '@/components/shared/Sidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/internal/dashboard', icon: 'LayoutDashboard' },
  { label: 'All Orders', href: '/internal/orders', icon: 'Package' },
  { label: 'Catalog', href: '/internal/catalog', icon: 'BookOpen' },
  { label: 'Workshops', href: '/internal/workshops', icon: 'Wrench' },
]

export default async function InternalLayout({ children }: { children: ReactNode }) {
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
        role="internal"
        navItems={NAV_ITEMS}
        fullName={profile?.full_name ?? undefined}
      />
      <main className="ml-[220px] min-h-screen bg-surface-secondary">
        {children}
      </main>
    </div>
  )
}
