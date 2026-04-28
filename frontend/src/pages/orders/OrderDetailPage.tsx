import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getOrder, markOrderWarehouseComplete } from '../../api/ordersApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const STATUS_STYLES: Record<string, string> = {
  VALIDATED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  PICKED:    'bg-sky-50 text-sky-700 border border-sky-200',
  SHIPPED:   'bg-amber-50 text-amber-700 border border-amber-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
}

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
    onError: (err) => toast.error(extractErrorMessage(err, 'Update failed')),
  })

  if (isLoading) return <div className="text-slate-500">Loading…</div>
  if (isError || !data) return <div className="text-red-600">Order not found.</div>

  const ref = data.referenceNumber ?? `#${data.id}`
  const total = data.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wide">Order</p>
          <h1 className="text-2xl font-semibold text-slate-900">{ref}</h1>
        </div>
        <div className="flex items-center gap-3">
          {canComplete && data.status === 'VALIDATED' && (
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Order details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[data.status] ?? 'bg-slate-100 text-slate-700'}`}>
                  {data.status}
                </span>
              </dd>
            </div>
            <div className="flex justify-between"><dt className="text-slate-500">Placed</dt><dd>{new Date(data.createdAt).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Last updated</dt><dd>{new Date(data.updatedAt).toLocaleString()}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Shipping address</h2>
          <p className="text-sm text-slate-700 whitespace-pre-line">{data.shippingAddress}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Items</h2>
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
