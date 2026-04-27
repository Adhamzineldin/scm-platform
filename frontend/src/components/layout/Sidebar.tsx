import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Warehouse,
  Truck,
  ShoppingCart,
  Users,
  Bell,
  FileText,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../../api/authApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

interface NavLink {
  to: string
  label: string
  icon: LucideIcon
  /** undefined = visible to every authenticated user. ADMIN is always allowed. */
  roles?: Role[]
}

const ALL_LINKS: NavLink[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, roles: ['ORDER_PROCESSING'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['INVENTORY_MANAGER'] },
  { to: '/warehouse', label: 'Warehouse', icon: Warehouse, roles: ['WAREHOUSE_SPECIALIST'] },
  { to: '/shipments', label: 'Shipments', icon: Truck, roles: ['SHIPMENT_LEAD'] },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/users', label: 'Users', icon: Users, roles: [] }, // ADMIN-only (empty list + ADMIN bypass)
  { to: '/profile', label: 'Profile', icon: User },
]

function isVisible(link: NavLink, role: Role | null): boolean {
  if (!role) return false
  if (role === 'ADMIN') return true
  if (!link.roles) return true
  return link.roles.includes(role)
}

export default function Sidebar() {
  const role = useAuthStore((s) => s.role)
  const links = ALL_LINKS.filter((l) => isVisible(l, role))

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center border-b border-slate-200 px-6 text-lg font-semibold text-slate-900">
        SCM Platform
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
