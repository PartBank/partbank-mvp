import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type NavItem } from '@/components/shared/Sidebar'

const NAV_ITEMS: NavItem[] = [
  { label: 'Katalog', href: '/catalog', icon: 'BookOpen' },
  { label: 'Pesanan Saya', href: '/orders', icon: 'Package' },
]

export default async function CustomerLayout({ children }: { children: ReactNode }) {
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
        role="customer"
        navItems={NAV_ITEMS}
        fullName={profile?.full_name ?? undefined}
      />
      <main className="ml-[240px] min-h-screen bg-surface-secondary">
        {children}
      </main>
    </div>
  )
}
