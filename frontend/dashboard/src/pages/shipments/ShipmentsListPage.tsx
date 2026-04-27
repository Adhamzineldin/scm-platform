import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listShipments } from '../../api/shipmentsApi'

export default function ShipmentsListPage() {
  const { data, isLoading } = useQuery({ queryKey: ['shipments'], queryFn: listShipments })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Shipments</h1>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Tracking</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading…</td></tr>
            ) : (data ?? []).length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">No shipments</td></tr>
            ) : (
              data!.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{s.id}</td>
                  <td className="px-4 py-3">{s.orderId}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.trackingNumber}</td>
                  <td className="px-4 py-3">{s.carrier}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{s.status}</span>
                  </td>
                  <td className="px-4 py-3">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/shipments/${s.id}`} className="text-indigo-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

