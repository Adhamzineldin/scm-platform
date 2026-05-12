import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShieldCheck, Eye, EyeOff, Truck } from 'lucide-react'
import { login, verifyOtp, resendOtp, type LoginRequest } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

type Step = 'login' | 'otp'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' })
  const [step, setStep] = useState<Step>('login')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const loginMut = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data)
      toast.success('Welcome back!')
      navigate('/dashboard', { replace: true })
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, 'Invalid credentials')
      if (msg.toLowerCase().includes('not verified') || msg.toLowerCase().includes('email not verified')) {
        setStep('otp')
        toast('Please verify your email first', { icon: '📧' })
      } else {
        toast.error(msg)
      }
    },
  })

  const verifyMut = useMutation({
    mutationFn: () => verifyOtp(form.email, otp),
    onSuccess: (data) => {
      setAuth(data)
      toast.success('Email verified — welcome!')
      navigate('/dashboard', { replace: true })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Invalid or expired code')),
  })

  const resendMut = useMutation({
    mutationFn: () => resendOtp(form.email),
    onSuccess: () => toast.success('New code sent — check your email'),
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to resend')),
  })

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); verifyMut.mutate() }}
          className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
              <p className="mt-1 text-sm text-slate-500">
                We sent a 6-digit code to <span className="font-semibold text-slate-700">{form.email}</span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-2xl tracking-[0.6em] font-mono focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={verifyMut.isPending || otp.length < 6}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {verifyMut.isPending ? 'Verifying…' : 'Verify & Sign in'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => setStep('login')} className="text-slate-500 hover:text-slate-800">
              ← Back
            </button>
            <button
              type="button"
              disabled={resendMut.isPending}
              onClick={() => resendMut.mutate()}
              className="text-indigo-600 hover:underline disabled:opacity-50"
            >
              {resendMut.isPending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-indigo-600 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Truck size={20} />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">SCM Platform</p>
            <p className="text-indigo-200 text-xs">Supply Chain Management</p>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Manage your supply chain<br />with confidence.
          </h2>
          <p className="mt-4 text-indigo-200 text-lg">
            End-to-end visibility across orders, inventory, warehouse, and shipments — all in one platform.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {['Real-time tracking', 'Smart inventory', 'Auto notifications', 'Role-based access'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-indigo-100">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-sm">© 2025 SCM Platform. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Truck size={18} />
            </div>
            <span className="font-bold text-slate-900">SCM Platform</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue</p>

          <form
            onSubmit={(e) => { e.preventDefault(); loginMut.mutate(form) }}
            className="mt-8 space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMut.isPending}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loginMut.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
