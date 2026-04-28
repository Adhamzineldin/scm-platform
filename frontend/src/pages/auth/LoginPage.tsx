import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'
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

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    loginMut.mutate(form)
  }

  const handleVerify = (e: FormEvent) => {
    e.preventDefault()
    verifyMut.mutate()
  }

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <form
          onSubmit={handleVerify}
          className="w-full max-w-sm space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
              <ShieldCheck size={24} className="text-indigo-600" />
            </span>
            <h1 className="text-xl font-semibold text-slate-900">Verify your email</h1>
            <p className="text-sm text-slate-500">
              Enter the code sent to{' '}
              <span className="font-medium text-slate-700">{form.email}</span>
            </p>
          </div>

          <div className="space-y-1">
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-2xl tracking-[0.5em] font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={verifyMut.isPending || otp.length < 6}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {verifyMut.isPending ? 'Verifying…' : 'Verify & Sign in'}
          </button>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <button
              type="button"
              onClick={() => setStep('login')}
              className="hover:text-slate-700 hover:underline"
            >
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loginMut.isPending}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loginMut.isPending ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-slate-600">
          No account?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}
