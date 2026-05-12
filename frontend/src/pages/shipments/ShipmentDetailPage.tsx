import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  advanceShipmentStatus,
  dispatchShipment,
  getShipment,
  type DispatchRequest,
} from '../../api/shipmentsApi.ts'
import { getOrder } from '../../api/ordersApi.ts'
import { listZones } from '../../api/warehouseApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { displayUser, useUserNames } from '../../hooks/useUserNames.ts'

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  CREATED:          { badge: 'bg-slate-100 text-slate-700 border-slate-200',    dot: 'bg-slate-400' },
  PENDING:          { badge: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-400' },
  SHIPPED:          { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-500' },
  DISPATCHED:       { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-500' },
  IN_TRANSIT:       { badge: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500' },
  OUT_FOR_DELIVERY: { badge: 'bg-violet-50 text-violet-700 border-violet-200',  dot: 'bg-violet-500' },
  DELIVERED:        { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  FAILED:           { badge: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-500' },
  RETURNED:         { badge: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-500' },
  CANCELLED:        { badge: 'bg-slate-100 text-slate-500 border-slate-200',    dot: 'bg-slate-300' },
}

const DISPATCH_FIELDS: { key: keyof DispatchRequest; label: string; placeholder: string }[] = [
  { key: 'carrierReference', label: 'Carrier Reference',  placeholder: 'Carrier tracking / booking ref' },
]

const COMMON_CARRIERS = ['DHL', 'FedEx', 'UPS', 'Aramex', 'SMSA Express', 'Bosta', 'Mylerz'] as const

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.role)
  const canDispatch = role === 'ADMIN' || role === 'SHIPMENT_LEAD'

  const [form, setForm] = useState<DispatchRequest>({
    carrierName: '',
    carrierReference: '',
    pickupLocation: '',
    deliveryAddress: '',
    notes: '',
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => getShipment(id!),
    enabled: !!id,
  })

  // Resolve usernames for shipment history "changedBy" entries
  const userNames = useUserNames((data?.history ?? []).map((h) => h.changedBy))

  // Look up the linked order so we can prefill the delivery address (the order's shipping address)
  const { data: linkedOrder } = useQuery({
    queryKey: ['order', data?.orderId],
    queryFn: () => getOrder(data!.orderId),
    enabled: !!data?.orderId,
  })

  // Warehouse zones for "pickup location" dropdown
  const { data: zonesPage } = useQuery({
    queryKey: ['zones', 'shipment-detail', 0, 200],
    queryFn: () => listZones({ page: 0, size: 200 }),
  })
  const zones = zonesPage?.content ?? []

  // Prefill delivery address once the linked order arrives
  useEffect(() => {
    if (linkedOrder?.shippingAddress && !form.deliveryAddress) {
      setForm((f) => ({ ...f, deliveryAddress: linkedOrder.shippingAddress }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedOrder?.shippingAddress])

  const dispatchMut = useMutation({
    mutationFn: (body: DispatchRequest) => dispatchShipment(id!, body),
    onSuccess: () => {
      toast.success('Shipment dispatched successfully')
      qc.invalidateQueries({ queryKey: ['shipment', id] })
      qc.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: () => toast.error('Dispatch failed'),
  })

  const advanceMut = useMutation({
    mutationFn: (status: string) => advanceShipmentStatus(Number(id), status),
    onSuccess: (_, status) => {
      toast.success(`Shipment marked as ${status.replace('_', ' ')}`)
      qc.invalidateQueries({ queryKey: ['shipment', id] })
      qc.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: () => toast.error('Status update failed'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading shipment…
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Failed to load shipment.{' '}
        <Link to="/shipments" className="font-medium underline">Go back</Link>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[data.status] ?? STATUS_STYLES['CREATED']

  const handleDispatch = (e: FormEvent) => {
    e.preventDefault()
    dispatchMut.mutate(form)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {data.trackingNumber
                ? <span className="font-mono">{data.trackingNumber}</span>
                : `Shipment #${data.id}`}
            </h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle.badge}`}>
              {data.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            For order{' '}
            <Link to={`/orders/${data.orderId}`} className="font-medium text-indigo-600 hover:underline">
              #{data.orderId}
            </Link>
            {data.carrier && <> · {data.carrier}</>}
          </p>
        </div>
        <Link
          to="/shipments"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
        >
          ← Back to shipments
        </Link>
      </div>

      {/* PENDING call-to-action — shown to staff when shipment was just created manually */}
      {canDispatch && data.status === 'PENDING' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Shipment is pending dispatch</p>
            <p className="mt-0.5 text-xs text-amber-700">Fill in the carrier details in the dispatch form below to ship this order.</p>
          </div>
        </div>
      )}

      {/* Summary + Current Dispatch */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Shipment Info</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Tracking Number</dt>
              <dd className="font-mono text-xs bg-slate-100 px-2 py-1 rounded font-medium">
                {data.trackingNumber || '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Carrier</dt>
              <dd className="font-medium">{data.carrier || <span className="text-slate-400 italic font-normal">Not assigned</span>}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle.badge}`}>
                  {data.status.replace('_', ' ')}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-xs text-slate-600">{data.createdAt ? new Date(data.createdAt).toLocaleString() : '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Last Updated</dt>
              <dd className="text-xs text-slate-600">{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Current Dispatch</h2>
          {data.currentDispatch ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Dispatched At</dt>
                <dd className="text-xs text-slate-600">{new Date(data.currentDispatch.dispatchedAt).toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Carrier</dt>
                <dd className="font-medium">{data.currentDispatch.carrierName}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{data.currentDispatch.carrierReference}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Pickup</dt>
                <dd className="text-right text-xs max-w-[60%]">{data.currentDispatch.pickupLocation}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="text-right text-xs max-w-[60%]">{data.currentDispatch.deliveryAddress}</dd>
              </div>
              {data.currentDispatch.notes && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 mt-2">
                  <span className="font-medium text-slate-500 block mb-1">Notes</span>
                  {data.currentDispatch.notes}
                </div>
              )}
            </dl>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <svg className="mb-2 h-8 w-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-sm font-medium">No dispatch yet</p>
              {canDispatch && <p className="text-xs mt-1">Use the form below to dispatch this shipment</p>}
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Form */}
      {canDispatch && (
        <form
          onSubmit={handleDispatch}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {data.currentDispatch ? 'Re-dispatch Shipment' : 'Dispatch Shipment'}
            </h2>
            {data.currentDispatch && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Will overwrite current dispatch
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Carrier Name <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.carrierName}
                onChange={(e) => setForm({ ...form, carrierName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— select carrier —</option>
                {COMMON_CARRIERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Pickup Location <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.pickupLocation}
                onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— select warehouse zone —</option>
                {zones
                  .filter((z) => z.active && (z.type === 'SHIPPING' || z.type === 'PACKING' || z.type === 'STAGING'))
                  .map((z) => (
                    <option key={z.id} value={`${z.code} — ${z.name}`}>{z.code} — {z.name}</option>
                  ))}
                {zones.filter((z) => z.active && !['SHIPPING', 'PACKING', 'STAGING'].includes(z.type)).map((z) => (
                  <option key={z.id} value={`${z.code} — ${z.name}`}>{z.code} — {z.name}</option>
                ))}
              </select>
            </div>

            {DISPATCH_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  {label} <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder={placeholder}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}

            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Delivery Address <span className="text-red-500">*</span>
                {linkedOrder?.shippingAddress && (
                  <span className="ml-2 font-normal text-slate-400">(prefilled from order #{linkedOrder.id})</span>
                )}
              </label>
              <textarea
                required
                rows={2}
                placeholder="Recipient address"
                value={form.deliveryAddress ?? ''}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Notes <span className="text-slate-400">(optional)</span></label>
            <textarea
              placeholder="Any additional notes for this dispatch…"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={dispatchMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {dispatchMut.isPending ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Dispatching…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Dispatch
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Manual status advancement — SHIPPED → IN_TRANSIT → DELIVERED */}
      {canDispatch && (data.status === 'SHIPPED' || data.status === 'IN_TRANSIT') && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Advance Status</h2>
          <div className="flex items-center gap-3">
            {data.status === 'SHIPPED' && (
              <button
                onClick={() => advanceMut.mutate('IN_TRANSIT')}
                disabled={advanceMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Mark In Transit
              </button>
            )}
            {data.status === 'IN_TRANSIT' && (
              <button
                onClick={() => advanceMut.mutate('DELIVERED')}
                disabled={advanceMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Mark Delivered
              </button>
            )}
            <p className="text-xs text-slate-400">
              {data.status === 'SHIPPED' && 'Confirm carrier has collected the package.'}
              {data.status === 'IN_TRANSIT' && 'Confirm package has been delivered to the recipient.'}
            </p>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status Timeline</h2>
        {(data.history ?? []).length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400">
            <svg className="mb-2 h-8 w-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">No history yet</span>
          </div>
        ) : (
          <ol className="relative space-y-0 border-l-2 border-slate-200 ml-2">
            {(data.history ?? []).map((h, idx) => {
              const dotColor = STATUS_STYLES[h.newStatus]?.dot ?? 'bg-slate-400'
              const isLast = idx === (data.history ?? []).length - 1
              return (
                <li key={h.id} className={`relative pl-6 ${isLast ? 'pb-0' : 'pb-5'}`}>
                  <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${dotColor} shadow-sm`} />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-slate-900">
                      {h.previousStatus
                        ? <>{h.previousStatus.replace('_', ' ')} <span className="text-slate-400 font-normal">→</span> {h.newStatus.replace('_', ' ')}</>
                        : h.newStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>{h.changedAt ? new Date(h.changedAt).toLocaleString() : '—'}</span>
                    {h.changedBy && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-slate-600">{displayUser(h.changedBy, userNames)}</span>
                      </>
                    )}
                    {h.location && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{h.location}</span>
                      </>
                    )}
                  </div>
                  {h.description && (
                    <p className="mt-1 text-xs text-slate-600">{h.description}</p>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
