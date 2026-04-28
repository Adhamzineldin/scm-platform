import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Boxes, ShoppingBag, Truck, AlertTriangle } from 'lucide-react'
import type { ComponentType } from 'react'
import { listMyOrders, listOrders, type OrderStatus } from '../../api/ordersApi.ts'
import { listProducts } from '../../api/inventoryApi.ts'
import { listShipments } from '../../api/shipmentsApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

const STATUS_COLORS: Record<OrderStatus, string> = {
  VALIDATED: '#6366f1',
  PICKED: '#0ea5e9',
  SHIPPED: '#f59e0b',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ size?: number }>
  tone: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`rounded-md p-2 ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const role = useAuthStore((s) => s.role)

  const canSeeAllOrders = role === 'ADMIN' || role === 'ORDER_PROCESSING'
  const canSeeMyOrders = role === 'CUSTOMER'
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
    queryKey: ['products'],
    queryFn: listProducts,
    enabled: canSeeInventory,
  })

  const shipmentsQuery = useQuery({
    queryKey: ['shipments', 0, 50],
    queryFn: () => listShipments({ size: 50 }),
    enabled: canSeeShipments,
  })

  const orders = (canSeeAllOrders ? allOrdersQuery.data?.content : myOrdersQuery.data?.content) ?? []
  const products = productsQuery.data ?? []
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>

      <div className="grid gap-4 md:grid-cols-4">
        {(canSeeAllOrders || canSeeMyOrders) && (
          <StatCard
            label={canSeeMyOrders ? 'My Orders' : 'Orders'}
            value={orderCount}
            icon={ShoppingBag}
            tone="bg-indigo-50 text-indigo-600"
          />
        )}
        {canSeeInventory && (
          <>
            <StatCard label="Products" value={products.length} icon={Boxes} tone="bg-sky-50 text-sky-600" />
            <StatCard label="Low Stock" value={lowStock} icon={AlertTriangle} tone="bg-red-50 text-red-600" />
          </>
        )}
        {canSeeShipments && (
          <StatCard label="Shipments" value={shipmentsQuery.data?.totalElements ?? 0} icon={Truck} tone="bg-amber-50 text-amber-600" />
        )}
      </div>

      {(canSeeAllOrders || canSeeMyOrders) && orders.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Orders by status</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name as OrderStatus] ?? '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {canSeeInventory && topProducts.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Top products by quantity</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {canSeeInventory && topProducts.length > 0 && !orders.length && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Top products by quantity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {role === 'CUSTOMER' && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
          <strong>Welcome!</strong> Browse the <a href="/shop" className="underline font-medium">Shop</a> to add products to your cart, then complete checkout from the <a href="/cart" className="underline font-medium">Cart</a> page.
        </div>
      )}
    </div>
  )
}
