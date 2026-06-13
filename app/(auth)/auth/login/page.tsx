'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldCheck, Truck, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/utils/roles'

const ROLE_DASHBOARDS: Record<string, string> = {
  internal: '/internal/dashboard',
  workshop: '/workshop/dashboard',
  customer: '/catalog',
}

const DEMO_ACCOUNTS = [
  { role: 'internal' as const, email: 'internal@partbank.com', password: 'password', Icon: ShieldCheck },
  { role: 'workshop' as const, email: 'workshop@bengkel.com',  password: 'password', Icon: Wrench },
  { role: 'customer' as const, email: 'buyer@buyer.com',       password: 'password', Icon: Truck },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)
  const [demoOpen, setDemoOpen] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role as string | undefined
    const destination = (role && ROLE_DASHBOARDS[role]) ?? '/auth/login'
    router.push(destination)
    router.refresh()
  }

  async function loginAsDemo(acc: (typeof DEMO_ACCOUNTS)[number]) {
    setDemoLoading(acc.email)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    })
    if (authError) {
      setError('Demo login failed. Please check Supabase seed data.')
      setDemoLoading(null)
      return
    }
    const role = data.user?.user_metadata?.role as string | undefined
    router.push((role && ROLE_DASHBOARDS[role]) ?? '/auth/login')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo + wordmark */}
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="PartBank" className="h-12 w-12 block" />
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">PartBank</h1>
          <p className="text-sm text-text-muted mt-0.5">Commercial vehicle parts platform</p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-white px-8 py-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Sign in to your account</h2>
          <p className="text-sm text-text-muted mt-1">Welcome back.</p>
        </div>

        {registered && (
          <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            Account created. You can sign in now.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-text-secondary text-xs font-medium uppercase tracking-wide">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-11 bg-surface-secondary border-border focus:border-navy-700 focus:ring-navy-700"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-text-secondary text-xs font-medium uppercase tracking-wide">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-11 bg-surface-secondary border-border focus:border-navy-700 focus:ring-navy-700"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white font-medium rounded-xl mt-2"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <p className="text-sm text-text-muted text-center mt-5">
          New to PartBank?{' '}
          <Link href="/auth/register" className="text-navy-700 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>

      {/* Demo credentials */}
      <div className="rounded-xl border border-dashed border-border bg-surface-secondary px-4 py-3">
        <button
          type="button"
          onClick={() => setDemoOpen((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <span className="text-xs font-medium text-text-secondary">PartBank Demo Accounts</span>
          <span className="text-[10px] text-text-muted">{demoOpen ? '▲' : '▼'}</span>
        </button>

        {demoOpen && (
          <div className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const colors = ROLE_COLORS[acc.role]
              const isLoading = demoLoading === acc.email
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => loginAsDemo(acc)}
                  disabled={!!demoLoading}
                  className={`group flex w-full items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${colors.hover}`}
                >
                  <div className="rounded-md bg-surface-secondary p-1.5 shrink-0 transition-colors group-hover:bg-white">
                    <acc.Icon className={`h-3.5 w-3.5 ${colors.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{ROLE_LABELS[acc.role]}</p>
                    <p className="text-[11px] text-text-muted truncate">{acc.email}</p>
                  </div>
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted shrink-0" />
                  ) : (
                    <span className={`text-xs font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${colors.labelColor}`}>
                      Log in →
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
