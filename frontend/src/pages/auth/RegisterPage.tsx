import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShieldCheck, Mail } from 'lucide-react'
import { register, verifyOtp, resendOtp, type RegisterRequest } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

type Step = 'form' | 'otp'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [step, setStep] = useState<Step>('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState<RegisterRequest>({ username: '', email: '', password: '' })

  const registerMut = useMutation({
    mutationFn: register,
    onSuccess: (res) => {
      setPendingEmail(res.email)
      setStep('otp')
      toast.success('Check your email for the verification code')
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Registration failed')),
  })

  const verifyMut = useMutation({
    mutationFn: () => verifyOtp(pendingEmail, otp),
    onSuccess: (data) => {
      setAuth(data)
      toast.success('Email verified — welcome!')
      navigate('/dashboard', { replace: true })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Invalid or expired code')),
  })

  const resendMut = useMutation({
    mutationFn: () => resendOtp(pendingEmail),
    onSuccess: () => toast.success('New code sent — check your email'),
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to resend')),
  })

  const handleRegister = (e: FormEvent) => {
    e.preventDefault()
    registerMut.mutate(form)
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
              We sent a 6-digit code to{' '}
              <span className="font-medium text-slate-700">{pendingEmail}</span>
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
            {verifyMut.isPending ? 'Verifying…' : 'Verify & Continue'}
          </button>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="hover:text-slate-700 hover:underline"
            >
              ← Change email
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
        onSubmit={handleRegister}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
          <p className="text-xs text-slate-500 mt-1">
            New accounts get the <b>CUSTOMER</b> role. An admin can grant privileged roles.
          </p>
        </div>

        {(['username', 'email', 'password'] as const).map((field) => (
          <div key={field} className="space-y-1">
            <label className="text-sm font-medium capitalize text-slate-700">{field}</label>
            <input
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              required
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ))}

        <div className="flex items-start gap-2 rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <Mail size={14} className="mt-0.5 shrink-0" />
          <span>We'll send a verification code to your email to confirm your account.</span>
        </div>

        <button
          type="submit"
          disabled={registerMut.isPending}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {registerMut.isPending ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
