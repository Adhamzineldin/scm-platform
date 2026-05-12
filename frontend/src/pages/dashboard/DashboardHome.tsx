import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Boxes, ShoppingBag, Truck, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'
import { listMyOrders, listOrders, type OrderStatus } from '../../api/ordersApi.ts'
import { listProducts } from '../../api/inventoryApi.ts'
import { listShipments } from '../../api/shipmentsApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

const STATUS_COLORS: Record<OrderStatus, string> = {
  VALIDATED: '#6366f1',
  PICKED:    '#0ea5e9',
  DISPATCHED:'#f59e0b',
  SHIPPED:   '#f59e0b',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
}

function StatCard({
  label, value, icon: Icon, tone, href, sublabel,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ size?: number; className?: string }>
  tone: { bg: string; icon: string; ring: string }
  href?: string
  sublabel?: string
}) {
  const inner = (
    <div className={`group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${href ? 'cursor-pointer' : ''}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone.bg} ring-1 ${tone.ring}`}>
        <Icon size={22} className={tone.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
        {sublabel && <p className="mt-0.5 text-xs text-slate-400">{sublabel}</p>}
      </div>
      {href && <ArrowRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />}
    </div>
  )
  return href ? <Link to={href}>{inner}</Link> : inner
}

export default function DashboardHome() {
  const { username, role } = useAuthStore()

  const canSeeAllOrders = role === 'ADMIN' || role === 'ORDER_PROCESSING'
  const canSeeMyOrders  = role === 'CUSTOMER'
  const canSeeInventory = role === 'ADMIN' || role === 'INVENTORY_MANAGER'
  const canSeeShipments = role === 'ADMIN' || role === 'SHIPMENT_LEAD'

  const allOrdersQuery = useQuery({
    queryKey: ['orders', 0, 50],
    queryFn: () => listOrders({ size: 50 }),
    enabled: canSeeAllOrders,
  })
  const myOrdersQuery = useQuery({
    queryKey: ['my-orders', 0, 50],
    queryFn: () => listMyOrders({ size: 50 }),
    enabled: canSeeMyOrders,
  })
  const productsQuery = useQuery({
    queryKey: ['products', 'dashboard', 0, 200],
    queryFn: () => listProducts({ page: 0, size: 200 }),
    enabled: canSeeInventory,
  })
  const shipmentsQuery = useQuery({
    queryKey: ['shipments', 0, 50],
    queryFn: () => listShipments({ size: 50 }),
    enabled: canSeeShipments,
  })

  const orders   = (canSeeAllOrders ? allOrdersQuery.data?.content : myOrdersQuery.data?.content) ?? []
  const products = productsQuery.data?.content ?? []
  const lowStock = products.filter((p) => p.lowStock).length

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const topProducts = [...products]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)
    .map((p) => ({ name: p.sku, quantity: p.quantity }))

  const orderCount = canSeeAllOrders
    ? (allOrdersQuery.data?.totalElements ?? 0)
    : (myOrdersQuery.data?.totalElements ?? 0)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}{username ? `, ${username}` : ''}</h1>
          <p className="mt-0.5 text-sm text-slate-500">Here's what's happening across your supply chain today.</p>
        </div>
        <p className="hidden text-xs text-slate-400 sm:block">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(canSeeAllOrders || canSeeMyOrders) && (
          <StatCard
            label={canSeeMyOrders ? 'My Orders' : 'Total Orders'}
            value={orderCount}
            icon={ShoppingBag}
            tone={{ bg: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'ring-indigo-100' }}
            href="/orders"
            sublabel="View all orders"
          />
        )}
        {canSeeInventory && (
          <>
            <StatCard
              label="Products"
              value={products.length}
              icon={Boxes}
              tone={{ bg: 'bg-sky-50', icon: 'text-sky-600', ring: 'ring-sky-100' }}
              href="/inventory"
              sublabel="Manage inventory"
            />
            <StatCard
              label="Low Stock"
              value={lowStock}
              icon={AlertTriangle}
              tone={{ bg: 'bg-red-50', icon: 'text-red-500', ring: 'ring-red-100' }}
              sublabel={lowStock === 0 ? 'All good!' : 'Needs attention'}
            />
          </>
        )}
        {canSeeShipments && (
          <StatCard
            label="Shipments"
            value={shipmentsQuery.data?.totalElements ?? 0}
            icon={Truck}
            tone={{ bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' }}
            href="/shipments"
            sublabel="Track shipments"
          />
        )}
      </div>

      {/* Charts */}
      {(canSeeAllOrders || canSeeMyOrders) && orders.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-700">Orders by Status</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={85} innerRadius={40} paddingAngle={2} label>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name as OrderStatus] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {canSeeInventory && topProducts.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Boxes size={16} className="text-sky-500" />
                <h2 className="text-sm font-semibold text-slate-700">Top Products by Quantity</h2>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {canSeeInventory && topProducts.length > 0 && !orders.length && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Boxes size={16} className="text-sky-500" />
            <h2 className="text-sm font-semibold text-slate-700">Top Products by Quantity</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Customer welcome banner */}
      {role === 'CUSTOMER' && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-5">
          <div>
            <p className="font-semibold text-indigo-900">Ready to shop?</p>
            <p className="mt-0.5 text-sm text-indigo-600">Browse the shop and add items to your cart.</p>
          </div>
          <Link
            to="/shop"
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Go to Shop →
          </Link>
        </div>
      )}
    </div>
  )
}
