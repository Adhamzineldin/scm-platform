import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Warehouse,
  Truck,
  ShoppingCart,
  Store,
  Users,
  Bell,
  FileText,
  User,
  Zap,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
}

const NAV_GROUPS: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'Commerce',
    items: [
      { to: '/shop',   label: 'Shop',    icon: Store,        roles: ['CUSTOMER'] },
      { to: '/cart',   label: 'Cart',    icon: ShoppingCart, roles: ['CUSTOMER'] },
      { to: '/orders', label: 'Orders',  icon: ShoppingBag,  roles: ['ORDER_PROCESSING', 'CUSTOMER'] },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/inventory', label: 'Inventory', icon: Boxes,     roles: ['INVENTORY_MANAGER'] },
      { to: '/warehouse', label: 'Warehouse', icon: Warehouse, roles: ['WAREHOUSE_SPECIALIST'] },
      { to: '/shipments', label: 'Shipments', icon: Truck,     roles: ['SHIPMENT_LEAD'] },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/documents',     label: 'Documents',     icon: FileText },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/admin/users',   label: 'Users',         icon: Users, roles: [] },
      { to: '/admin/events',  label: 'Event State',   icon: Zap,   roles: [] },
      { to: '/profile',       label: 'Profile',       icon: User },
    ],
  },
]

function isVisible(item: NavItem, role: Role | null): boolean {
  if (!role) return false
  if (role === 'ADMIN') return true
  if (!item.roles) return true
  return item.roles.includes(role)
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const role = useAuthStore((s) => s.role)

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Truck size={16} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">SCM Platform</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Supply Chain</div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_GROUPS.map((group, gi) => {
          const visible = group.items.filter((item) => isVisible(item, role))
          if (visible.length === 0) return null
          return (
            <div key={gi}>
              {group.heading && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/dashboard'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="rounded-lg bg-indigo-50 px-3 py-2.5 text-xs text-indigo-700">
          <p className="font-semibold">SCM v1.0</p>
          <p className="text-indigo-500 mt-0.5">All systems operational</p>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white shadow-sm md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}
