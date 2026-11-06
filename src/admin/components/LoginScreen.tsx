import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSeo } from '@/hooks/useSeo'
import { ApiError } from '@/services/api'
import { Button, Input } from '@/components/ui'
import { LogoMark } from '@/components/layout/Logo'
import { optionalEmail, required } from '@/lib/validation'

type Errors = { email?: string; password?: string; form?: string }

export interface LoginCopy {
  /** Browser tab title. */
  seoTitle: string
  heading: string
  subheading: string
  /** Big line on the brand panel (desktop). */
  tagline: ReactNode
}

/**
 * Sign-in screen used by each portal with its own copy. Each portal page passes ONLY its own text,
 * so the admin login never shows anything about other portals. The server accepts each role only
 * on its own portal (wrong portal = "Incorrect email or password.").
 */
export function LoginScreen({ portal, copy, isAllowed }: { portal: 'admin' | 'owner'; copy: LoginCopy; isAllowed: (role: string) => boolean }) {
  const { status, login, ensureSession, expired, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const home = `/${portal}`
  useSeo({ title: copy.seoTitle, path: `${home}/login`, noIndex: true })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const requestedFrom = (location.state as { from?: string } | null)?.from
  const from = typeof requestedFrom === 'string'
    && (requestedFrom === home || requestedFrom.startsWith(`${home}/`))
    && !requestedFrom.startsWith(`${home}/login`)
    && !requestedFrom.includes('\\')
    ? requestedFrom
    : home

  useEffect(() => { ensureSession() }, [ensureSession])
  // Already signed in to this portal: go straight in. (A session for another portal shows the form.)
  if (status === 'authenticated' && user && isAllowed(user.role)) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {
      email: required('your email')(email) || optionalEmail(email) || undefined,
      password: required('your password')(password) || undefined,
    }
    setErrors(next)
    if (next.email || next.password) return
    setLoading(true)
    try {
      await login(email.trim(), password, portal)
      navigate(from, { replace: true })
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {}
      setErrors({ email: fe.email, password: fe.password, form: err instanceof Error ? err.message : 'Sign-in failed. Try again.' })
      setPassword('')
      passwordRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (desktop) */}
      <section aria-hidden className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <div className="absolute -left-24 -top-24 size-[28rem] rounded-full bg-sun-400/25 blur-3xl" />
        <div className="absolute -bottom-32 right-0 size-[30rem] rounded-full bg-steel-500/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '56px 56px' }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <LogoMark className="size-12" />
            <span className="font-display text-2xl font-semibold text-snow-50">Baba Solars</span>
          </div>
          <p className="max-w-md font-display text-4xl font-semibold leading-tight text-snow-50 xl:text-5xl">
            {copy.tagline}
          </p>
          <p className="text-sm text-snow-300/70">© {new Date().getFullYear()} Baba Solars</p>
        </div>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center bg-gradient-to-b from-ice-100 to-canvas px-4 py-10 sm:px-8 lg:bg-none lg:bg-surface">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="size-11" />
            <span className="font-display text-xl font-semibold text-ink">Baba Solars</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink">{copy.heading}</h1>
          <p className="mt-1.5 text-muted">{copy.subheading}</p>

          <div className="mt-8 rounded-card bg-surface p-6 shadow-card sm:p-7 lg:p-0 lg:shadow-none">
            {expired && (
              <p role="status" className="mb-5 rounded-field bg-sun-300/30 p-3 text-sm text-navy-800">Your session ended. Please sign in again.</p>
            )}
            <form onSubmit={submit} className="grid gap-5" noValidate>
              <Input
                label="Email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email || errors.form) setErrors({}) }}
                error={errors.email}
              />
              <div className="relative">
                <Input
                  ref={passwordRef}
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  className="pr-11"
                  onChange={(e) => { setPassword(e.target.value); if (errors.password || errors.form) setErrors({}) }}
                  error={errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-[1.85rem] grid size-9 place-items-center rounded-field text-muted transition-colors hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </div>
              {errors.form && <p role="alert" className="rounded-field bg-clay-100 px-3.5 py-3 text-sm font-medium text-clay-700">{errors.form}</p>}
              <Button type="submit" size="lg" loading={loading} leftIcon={<LockKeyhole className="size-4" />} className="w-full">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>

          <div className="mt-8 text-sm">
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-field font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-sun-500">
              <ArrowLeft className="size-4" aria-hidden /> Back to website
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
