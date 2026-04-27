import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShipment } from '../../api/shipmentsApi.ts'

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => getShipment(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="text-slate-500">Loading…</div>
  if (isError || !data) return <div className="text-red-600">Failed to load shipment.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Shipment #{data.id}</h1>
        <Link to="/shipments" className="text-sm text-indigo-600 hover:underline">← Back</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Order</dt><dd>#{data.orderId}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tracking</dt><dd className="font-mono text-xs">{data.trackingNumber}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Carrier</dt><dd>{data.carrier}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{data.status}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Current dispatch</h2>
          {data.currentDispatch ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Dispatched at</dt><dd>{new Date(data.currentDispatch.dispatchedAt).toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Carrier</dt><dd>{data.currentDispatch.carrierName}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Reference</dt><dd>{data.currentDispatch.carrierReference}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Pickup</dt><dd>{data.currentDispatch.pickupLocation}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Delivery</dt><dd>{data.currentDispatch.deliveryAddress}</dd></div>
              {data.currentDispatch.notes && <p className="pt-2 text-xs text-slate-500">{data.currentDispatch.notes}</p>}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No dispatch yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Status history</h2>
        <ol className="space-y-3 border-l border-slate-200 pl-4">
          {(data.history ?? []).map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-indigo-500" />
              <div className="text-sm font-medium text-slate-900">
                {h.previousStatus ? `${h.previousStatus} → ` : ''}{h.newStatus}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(h.changedAt).toLocaleString()} · {h.changedBy ?? 'system'} · {h.location ?? '—'}
              </div>
              {h.description && <div className="mt-1 text-xs text-slate-600">{h.description}</div>}
            </li>
          ))}
          {(data.history ?? []).length === 0 && (
            <li className="text-sm text-slate-500">No history yet.</li>
          )}
        </ol>
      </div>
    </div>
  )
}

