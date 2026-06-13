'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerUser } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Role = 'customer' | 'workshop'

const ROLE_DASHBOARDS: Record<Role, string> = {
  customer: '/catalog',
  workshop: '/workshop/dashboard',
}

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'customer', label: 'Buyer', description: 'Order parts for your fleet' },
  { value: 'workshop', label: 'Workshop', description: 'Fulfill production orders' },
]

interface FormErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
  workshopName?: string
  general?: string
}

export default function RegisterPage() {
  const router = useRouter()

  const [role, setRole] = useState<Role>('customer')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [workshopName, setWorkshopName] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!fullName.trim()) errs.fullName = 'Full name is required.'
    if (!email.trim()) errs.email = 'Email is required.'
    if (password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.'
    if (role === 'workshop' && !workshopName.trim()) {
      errs.workshopName = 'Workshop name is required.'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)

    const { error: registerError } = await registerUser({
      email,
      password,
      role,
      fullName,
      workshopName,
    })

    if (registerError) {
      setErrors({ general: registerError })
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      router.push('/auth/login?registered=true')
      return
    }
    router.push(ROLE_DASHBOARDS[role])
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
          <h2 className="text-lg font-semibold text-text-primary">Create your account</h2>
          <p className="text-sm text-text-muted mt-1">Get started with PartBank.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role toggle */}
          <div className="space-y-1.5">
            <Label className="text-text-secondary text-xs font-medium uppercase tracking-wide">
              Account Type
            </Label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-secondary p-1">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  disabled={loading}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-left transition-all',
                    role === r.value
                      ? 'bg-navy-900 shadow-sm'
                      : 'hover:bg-white/60'
                  )}
                >
                  <p className={cn(
                    'text-xs font-semibold',
                    role === r.value ? 'text-white' : 'text-text-primary'
                  )}>
                    {r.label}
                  </p>
                  <p className={cn(
                    'text-[11px] mt-0.5 leading-tight',
                    role === r.value ? 'text-white/70' : 'text-text-muted'
                  )}>
                    {r.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-text-secondary text-xs font-medium uppercase tracking-wide">
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className="h-11 bg-surface-secondary border-border"
            />
            {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
          </div>

          {/* Workshop Name */}
          {role === 'workshop' && (
            <div className="space-y-1.5">
              <Label htmlFor="workshopName" className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                Workshop Name
              </Label>
              <Input
                id="workshopName"
                type="text"
                placeholder="Your workshop name"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                disabled={loading}
                className="h-11 bg-surface-secondary border-border"
              />
              {errors.workshopName && <p className="text-xs text-red-600">{errors.workshopName}</p>}
            </div>
          )}

          {/* Email */}
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
              disabled={loading}
              className="h-11 bg-surface-secondary border-border"
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-text-secondary text-xs font-medium uppercase tracking-wide">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-11 bg-surface-secondary border-border"
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-text-secondary text-xs font-medium uppercase tracking-wide">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="h-11 bg-surface-secondary border-border"
            />
            {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

          {errors.general && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white font-medium rounded-xl mt-2"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="text-sm text-text-muted text-center mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-navy-700 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
