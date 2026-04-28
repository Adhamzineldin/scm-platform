import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Circle, Package, Truck, MapPin, ClipboardList, User } from 'lucide-react'
import { getOrder, markOrderWarehouseComplete, getOrderHistory } from '../../api/ordersApi.ts'
import { getShipmentByOrder } from '../../api/shipmentsApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const ALL_STATUSES = ['VALIDATED', 'PICKED', 'SHIPPED', 'DELIVERED'] as const

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Package }> = {
  VALIDATED: { label: 'Order Placed',   color: 'text-indigo-600',  bg: 'bg-indigo-600',  icon: ClipboardList },
  PICKED:    { label: 'Picked',         color: 'text-sky-600',     bg: 'bg-sky-600',     icon: Package },
  SHIPPED:   { label: 'Shipped',        color: 'text-amber-600',   bg: 'bg-amber-600',   icon: Truck },
  DELIVERED: { label: 'Delivered',      color: 'text-emerald-600', bg: 'bg-emerald-600', icon: MapPin },
  CANCELLED: { label: 'Cancelled',      color: 'text-red-600',     bg: 'bg-red-600',     icon: Circle },
}

const BADGE: Record<string, string> = {
  VALIDATED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  PICKED:    'bg-sky-50 text-sky-700 border border-sky-200',
  SHIPPED:   'bg-amber-50 text-amber-700 border border-amber-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
}

function fmt(dt: string | null | undefined) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { role, userId } = useAuthStore()

  const isStaff = role === 'ADMIN' || role === 'WAREHOUSE_SPECIALIST' || role === 'ORDER_PROCESSING' || role === 'SHIPMENT_LEAD'
  const canPick = role === 'ADMIN' || role === 'WAREHOUSE_SPECIALIST'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', id],
    queryFn: () => getOrderHistory(id!),
    enabled: !!id,
  })

  const { data: shipment } = useQuery({
    queryKey: ['shipment-by-order', id],
    queryFn: () => getShipmentByOrder(id!),
    enabled: !!id,
    retry: false,
  })

  const completeMut = useMutation({
    mutationFn: () => markOrderWarehouseComplete(id!, userId ?? 'unknown'),
    onSuccess: () => {
      toast.success('Order marked as picked')
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['order-history', id] })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Update failed')),
  })

  if (isLoading) return <div className="flex h-40 items-center justify-center text-slate-400">Loading…</div>
  if (isError || !data) return <div className="text-red-600 p-4">Order not found.</div>

  const ref = data.referenceNumber ?? `#${data.id}`
  const total = data.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
  const isCancelled = data.status === 'CANCELLED'
  const currentIdx = isCancelled ? -1 : ALL_STATUSES.indexOf(data.status as typeof ALL_STATUSES[number])

  // Build a map of status → history entry for the timeline
  const historyByStatus: Record<string, { changedAt: string; changedBy: string | null }> = {}
  for (const h of history) {
    historyByStatus[h.newStatus] = { changedAt: h.changedAt, changedBy: h.changedBy }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wide">Order</p>
          <h1 className="text-2xl font-semibold text-slate-900">{ref}</h1>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[data.status] ?? 'bg-slate-100 text-slate-700'}`}>
            {data.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {canPick && data.status === 'VALIDATED' && (
            <button
              onClick={() => completeMut.mutate()}
              disabled={completeMut.isPending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {completeMut.isPending ? 'Marking…' : 'Mark as picked'}
            </button>
          )}
          <Link to="/orders" className="text-sm text-indigo-600 hover:underline">← Back</Link>
        </div>
      </div>

      {/* Status Timeline — shown for everyone */}
      {!isCancelled && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Order Status</h2>
          <div className="relative flex items-start justify-between">
            {/* connector line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" style={{ zIndex: 0 }} />
            <div
              className="absolute top-4 left-0 h-0.5 bg-indigo-500 transition-all"
              style={{ width: `${currentIdx >= 0 ? (currentIdx / (ALL_STATUSES.length - 1)) * 100 : 0}%`, zIndex: 1 }}
            />

            {ALL_STATUSES.map((status, idx) => {
              const cfg = STATUS_CONFIG[status]
              const Icon = cfg.icon
              const done = idx <= currentIdx
              const active = idx === currentIdx
              const entry = historyByStatus[status]

              return (
                <div key={status} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / ALL_STATUSES.length}%` }}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    done
                      ? `${cfg.bg} border-transparent text-white`
                      : 'border-slate-300 bg-white text-slate-400'
                  } ${active ? 'ring-4 ring-offset-2 ring-indigo-200' : ''}`}>
                    {done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${done ? cfg.color : 'text-slate-400'}`}>
                    {cfg.label}
                  </p>
                  {entry ? (
                    <p className="mt-0.5 text-[10px] text-slate-400 text-center leading-tight">
                      {fmt(entry.changedAt)}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-slate-300 text-center">—</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          This order has been cancelled.
        </div>
      )}

      {/* Status history timeline — detailed (shown to all) */}
      {history.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Activity Log</h2>
          <ol className="relative ml-3 border-l border-slate-200">
            {history.map((h) => {
              const cfg = STATUS_CONFIG[h.newStatus] ?? { label: h.newStatus, color: 'text-slate-600', bg: 'bg-slate-400', icon: Circle }
              return (
                <li key={h.id} className="mb-5 ml-5">
                  <span className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ${cfg.bg}`}>
                    <CheckCircle2 size={10} className="text-white" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                    {h.previousStatus && (
                      <span className="text-xs text-slate-400">from {h.previousStatus}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{fmt(h.changedAt)}</p>
                  {h.changedBy && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <User size={10} /> {h.changedBy}
                    </p>
                  )}
                  {h.note && <p className="mt-0.5 text-xs text-slate-500 italic">{h.note}</p>}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Shipment tracking card — shown when shipment exists */}
      {shipment && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Shipment Tracking</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tracking #</span>
                <span className="font-mono text-xs font-semibold text-slate-900">{shipment.trackingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[shipment.status] ?? 'bg-slate-100 text-slate-700'}`}>
                  {shipment.status}
                </span>
              </div>
              {shipment.carrier && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Carrier</span>
                  <span>{shipment.carrier}</span>
                </div>
              )}
            </div>
            {shipment.currentDispatch && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Carrier ref</span>
                  <span className="font-mono text-xs">{shipment.currentDispatch.carrierReference || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dispatched</span>
                  <span>{fmt(shipment.currentDispatch.dispatchedAt)}</span>
                </div>
                {shipment.currentDispatch.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Notes</span>
                    <span className="text-right max-w-[60%]">{shipment.currentDispatch.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shipment history — visible to staff/admin */}
          {isStaff && shipment.history && shipment.history.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Shipment History</h3>
              <ol className="relative ml-3 border-l border-slate-200">
                {shipment.history.map((h) => (
                  <li key={h.id} className="mb-4 ml-5">
                    <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-slate-400" />
                    <p className="text-xs font-semibold text-slate-700">
                      {h.previousStatus ? `${h.previousStatus} → ` : ''}{h.newStatus}
                    </p>
                    <p className="text-xs text-slate-500">{fmt(h.changedAt)}</p>
                    {h.changedBy && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <User size={10} /> {h.changedBy}
                      </p>
                    )}
                    {h.description && <p className="text-xs text-slate-500 italic">{h.description}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Order Details + Shipping */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Order details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Order ID</dt>
              <dd className="font-mono text-xs">#{data.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Reference</dt>
              <dd className="font-mono text-xs">{data.referenceNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Placed</dt>
              <dd>{fmt(data.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Last updated</dt>
              <dd>{fmt(data.updatedAt)}</dd>
            </div>
            {isStaff && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Customer ID</dt>
                <dd className="font-mono text-xs">{data.userId}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Shipping address</h2>
          <p className="text-sm text-slate-700 whitespace-pre-line">{data.shippingAddress}</p>
        </div>
      </div>

      {/* Items table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Items ({data.items.length})</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.sku} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">${Number(item.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
