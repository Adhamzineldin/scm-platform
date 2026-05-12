import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Truck } from 'lucide-react'
import { listShipments, createShipment } from '../../api/shipmentsApi.ts'
import { listOrdersByStatus } from '../../api/ordersApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

const STATUS_STYLES: Record<string, string> = {
  CREATED:     'bg-slate-100 text-slate-700 border-slate-200',
  PENDING:     'bg-amber-50 text-amber-700 border-amber-200',
  SHIPPED:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  DISPATCHED:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_TRANSIT:  'bg-blue-50 text-blue-700 border-blue-200',
  OUT_FOR_DELIVERY: 'bg-violet-50 text-violet-700 border-violet-200',
  DELIVERED:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED:      'bg-red-50 text-red-700 border-red-200',
  RETURNED:    'bg-orange-50 text-orange-700 border-orange-200',
  CANCELLED:   'bg-slate-100 text-slate-500 border-slate-200',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function ShipmentsListPage() {
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [orderSearch, setOrderSearch] = useState('')
  const size = 20
  const { role } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const canCreate = role === 'ADMIN' || role === 'SHIPMENT_LEAD'

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', page, size],
    queryFn: () => listShipments({ page, size }),
  })

  // Load PICKED orders for the picker modal
  const { data: pickedOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-picked'],
    queryFn: () => listOrdersByStatus('PICKED', { size: 50 }),
    enabled: showModal,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const selected = (pickedOrders?.content ?? []).find((o) => o.id === selectedOrderId)
      if (!selected) {
        throw new Error('Selected order not found')
      }
      return createShipment({
        orderId: selected.id,
        userId: selected.userId,
        shippingAddress: selected.shippingAddress,
      })
    },
    onSuccess: (shipment) => {
      toast.success('Shipment created')
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      setShowModal(false)
      setSelectedOrderId(null)
      setOrderSearch('')
      navigate(`/shipments/${shipment.id}`)
    },
    onError: () => toast.error('Failed to create shipment'),
  })

  const closeModal = () => {
    setShowModal(false)
    setSelectedOrderId(null)
    setOrderSearch('')
  }

  const shipments = data?.content ?? []

  const statusCounts = shipments.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})

  const qs = orderSearch.trim().toLowerCase()
  const filteredOrders = (pickedOrders?.content ?? []).filter(
    (o) =>
      !qs ||
      o.referenceNumber?.toLowerCase().includes(qs) ||
      o.id.toString().includes(qs) ||
      o.shippingAddress?.toLowerCase().includes(qs),
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="mt-0.5 text-sm text-slate-500">{data?.totalElements ?? 0} total shipments</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{data?.totalElements ?? 0} total</span>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Truck size={14} />
              Create Shipment
            </button>
          )}
        </div>
      </div>

      {/* Order picker modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Create Shipment — Select Order</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>

            <div className="px-5 py-3 border-b border-slate-100">
              <input
                type="text"
                placeholder="Search by reference, order ID or address…"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm">Loading orders…</div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  {qs ? `No PICKED orders matching "${orderSearch}"` : 'No PICKED orders available'}
                </div>
              ) : (
                filteredOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors ${
                      selectedOrderId === o.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{o.referenceNumber ?? `#${o.id}`}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{o.shippingAddress}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">Order #{o.id}</p>
                        <p className="text-xs text-slate-400">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">
                {selectedOrderId ? `Order #${selectedOrderId} selected` : 'Select an order above'}
              </p>
              <div className="flex gap-2">
                <button onClick={closeModal} className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!selectedOrderId || createMutation.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create Shipment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick-stats strip */}
      {!isLoading && Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span
              key={status}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
            >
              {status.replace('_', ' ')}
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-semibold">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tracking Number</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    Loading shipments…
                  </div>
                </td>
              </tr>
            ) : shipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <svg className="h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-sm font-medium">No shipments yet</span>
                    <span className="text-xs">Shipments are created automatically when orders are marked as picked</span>
                  </div>
                </td>
              </tr>
            ) : (
              shipments.map((s) => (
                <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-slate-800 bg-slate-100 rounded px-2 py-1">
                      {s.trackingNumber || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/orders/${s.orderId}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline text-xs font-medium"
                    >
                      #{s.orderId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{s.carrier || <span className="text-slate-400 italic">Not set</span>}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/shipments/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      Details
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {data?.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={data?.last ?? false}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
