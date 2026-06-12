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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Role = 'customer' | 'workshop'

const ROLE_DASHBOARDS: Record<Role, string> = {
  customer: '/catalog',
  workshop: '/workshop/dashboard',
}

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

    // Create the account server-side (admin API: instant, email auto-confirmed).
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

    // Sign in on the client to establish the browser session, then route by role.
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      // Account exists but auto sign-in failed — fall back to the login page.
      router.push('/auth/login?registered=true')
      return
    }
    router.push(ROLE_DASHBOARDS[role])
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Create your account</h1>
        <p className="text-sm text-text-secondary mt-1.5">Get started with PartBank.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role */}
        <div className="space-y-1.5">
          <Label htmlFor="role">Account Type</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as Role)}
            disabled={loading}
          >
            <SelectTrigger id="role" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Buyer (Truck Owner)</SelectItem>
              <SelectItem value="workshop">Workshop (Manufacturer)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="h-11"
          />
          {errors.fullName && (
            <p className="text-sm text-red-600">{errors.fullName}</p>
          )}
        </div>

        {/* Workshop Name — only when role is workshop */}
        {role === 'workshop' && (
          <div className="space-y-1.5">
            <Label htmlFor="workshopName">Workshop Name</Label>
            <Input
              id="workshopName"
              type="text"
              placeholder="Your workshop name"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              disabled={loading}
              className="h-11"
            />
            {errors.workshopName && (
              <p className="text-sm text-red-600">{errors.workshopName}</p>
            )}
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-11"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-11"
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="h-11"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {errors.general && (
          <p className="text-sm text-red-600">{errors.general}</p>
        )}

        <Button
          type="submit"
          className="w-full h-11 bg-navy-900 hover:bg-navy-800 text-white mt-1"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <p className="text-sm text-text-secondary text-center mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-navy-700 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
