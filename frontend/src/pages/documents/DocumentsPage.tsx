import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { listMyOrders, type OrderResponse } from '../../api/ordersApi.ts'
import { downloadOrderReceipt, saveBlob } from '../../api/documentsApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { Spinner } from '../../components/ui/Spinner.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'

const STATUS_CLS: Record<string, string> = {
  VALIDATED:  'bg-indigo-50 text-indigo-700 ring-indigo-200',
  PICKED:     'bg-sky-50 text-sky-700 ring-sky-200',
  SHIPPED:    'bg-amber-50 text-amber-700 ring-amber-200',
  DISPATCHED: 'bg-amber-50 text-amber-700 ring-amber-200',
  DELIVERED:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED:  'bg-red-50 text-red-700 ring-red-200',
}

export default function DocumentsPage() {
  const { username, userId } = useAuthStore()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const size = 20

  const ordersQuery = useQuery({
    queryKey: ['my-orders', page, size, 'documents'],
    queryFn: () => listMyOrders({ page, size }),
  })

  const handleDownload = async (order: OrderResponse) => {
    try {
      setBusyId(order.id)
      const blob = await downloadOrderReceipt({
        orderId: order.id,
        userId: String(userId ?? order.userId),
        referenceNumber: order.referenceNumber,
        shippingAddress: order.shippingAddress,
        status: order.status,
        createdAt: order.createdAt,
        customerName: username ?? undefined,
        items: order.items.map((it) => ({ sku: it.sku, quantity: it.quantity, unitPrice: it.unitPrice })),
      })
      saveBlob(blob, `order-${order.id}-receipt.pdf`)
      toast.success(`Receipt downloaded for order #${order.id}`)
    } catch {
      toast.error('Failed to download receipt')
    } finally {
      setBusyId(null)
    }
  }

  const orders = ordersQuery.data?.content ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="mt-0.5 text-sm text-slate-500">Download PDF receipts for your orders.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {ordersQuery.isLoading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState icon={FileText} title="No orders yet" description="Your order receipts will appear here once you place an order." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Order</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Items</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Placed</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                          {o.referenceNumber ?? `#${o.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_CLS[o.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDownload(o)}
                          disabled={busyId === o.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          <Download size={13} />
                          {busyId === o.id ? 'Generating…' : 'Receipt PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(ordersQuery.data?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">
                  Page <span className="font-semibold text-slate-700">{page + 1}</span> of {ordersQuery.data?.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                    <ChevronLeft size={15} />
                  </button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={ordersQuery.data?.last ?? false}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
