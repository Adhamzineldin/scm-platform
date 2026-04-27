import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { register, type RegisterRequest } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
  })

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuth(data)
      toast.success('Account created — you can now place orders')
      navigate('/dashboard', { replace: true })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Registration failed')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
        <p className="text-xs text-slate-500">
          New accounts are created with the <b>CUSTOMER</b> role. An administrator
          can grant you a privileged role afterwards.
        </p>

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

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Creating…' : 'Create account'}
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
