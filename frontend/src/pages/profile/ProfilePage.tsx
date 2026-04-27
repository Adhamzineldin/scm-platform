import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut, User } from 'lucide-react'
import { getMyDashboard } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { userId, logout, token } = useAuthStore()

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMyDashboard,
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>

      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <User size={28} />
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {meQuery.data?.username ?? '—'}
            </div>
            <div className="text-sm text-slate-500">{meQuery.data?.email ?? '—'}</div>
          </div>
        </div>

        <dl className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{meQuery.data?.role ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">User ID</dt>
            <dd className="font-mono text-xs text-slate-700">{userId ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Menu items</dt>
            <dd className="text-right text-slate-700">
              {meQuery.data?.menuItems?.join(', ') ?? '—'}
            </dd>
          </div>
        </dl>

        <details className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <summary className="cursor-pointer text-slate-600">JWT (debug)</summary>
          <pre className="mt-2 break-all whitespace-pre-wrap font-mono text-[10px] text-slate-500">
            {token ?? ''}
          </pre>
        </details>

        <button
          onClick={handleLogout}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  )
}

