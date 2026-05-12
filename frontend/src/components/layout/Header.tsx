import { Link, useNavigate } from 'react-router-dom'
import { Bell, User, LogOut, ChevronDown, Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore.ts'
import { useNotificationStore } from '../../store/notificationStore.ts'
import { getMyDashboard } from '../../api/authApi.ts'
import { API_BASE_URL } from '../../api/axiosInstance.ts'

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  CUSTOMER: 'Customer',
  INVENTORY_MANAGER: 'Inventory Manager',
  ORDER_PROCESSING: 'Order Processing',
  WAREHOUSE_SPECIALIST: 'Warehouse Specialist',
  SHIPMENT_LEAD: 'Shipment Lead',
  CLOUD_ARCHITECT: 'Cloud Architect',
  STAFF: 'Staff',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { username, role, logout } = useAuthStore()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <span className="hidden text-sm font-medium text-slate-400 sm:block">Supply Chain Management</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile dropdown */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-indigo-700 ring-2 ring-white">
              {pictureUrl ? (
                <img src={pictureUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User size={15} />
              )}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{username ?? 'User'}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{ROLE_LABELS[role ?? ''] ?? role ?? ''}</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
              <div className="border-b border-slate-100 px-4 pb-2 pt-1.5">
                <p className="text-xs font-semibold text-slate-900">{username ?? 'User'}</p>
                <p className="text-[11px] text-slate-400">{ROLE_LABELS[role ?? ''] ?? role}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <User size={14} /> My Profile
              </Link>
              <Link
                to="/notifications"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Bell size={14} /> Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
