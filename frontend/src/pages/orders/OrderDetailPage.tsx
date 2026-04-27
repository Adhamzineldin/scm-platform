import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getOrder, markOrderWarehouseComplete } from '../../api/ordersApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { role, userId } = useAuthStore()
  const canComplete = role === 'ADMIN' || role === 'WAREHOUSE_SPECIALIST'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  })

  const completeMut = useMutation({
    mutationFn: () => markOrderWarehouseComplete(id!, userId ?? 'unknown'),
    onSuccess: () => {
      toast.success('Order marked as picked')
      qc.invalidateQueries({ queryKey: ['order', id] })
    },
    onError: () => toast.error('Update failed'),
  })

  if (isLoading) return <div className="text-slate-500">Loading…</div>
  if (isError || !data) return <div className="text-red-600">Failed to load order.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Order #{data.id}</h1>
        <div className="flex items-center gap-3">
          {canComplete && data.status === 'VALIDATED' && (
            <button
              onClick={() => completeMut.mutate()}
              disabled={completeMut.isPending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {completeMut.isPending ? 'Marking…' : 'Mark warehouse complete'}
            </button>
          )}
          <Link to="/orders" className="text-sm text-indigo-600 hover:underline">← Back</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{data.status}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">User</dt><dd>{data.userId}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Updated</dt><dd>{new Date(data.updatedAt).toLocaleString()}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Idempotency key</dt><dd className="truncate">{data.idempotencyKey}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Shipping address</h2>
          <p className="text-sm text-slate-700">{data.shippingAddress}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.sku} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.sku}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">${Number(item.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-3">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
