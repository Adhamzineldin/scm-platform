import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Bell, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore.ts'
import { useNotificationStore } from '../../store/notificationStore.ts'
import { getMyDashboard } from '../../api/authApi.ts'
import { API_BASE_URL } from '../../api/axiosInstance.ts'

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`
}

export default function Header() {
  const navigate = useNavigate()
  const { username, role, logout } = useAuthStore()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMyDashboard,
    staleTime: 5 * 60 * 1000,
  })

  const pictureUrl = resolveMediaUrl(meQuery.data?.profilePictureUrl)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">Supply Chain Management</div>
      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-right hover:bg-slate-100"
          title="Profile"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">{username ?? 'User'}</div>
            <div className="text-xs text-slate-500">{role ?? ''}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-700">
            {pictureUrl ? (
              <img src={pictureUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User size={16} />
            )}
          </div>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  )
}
