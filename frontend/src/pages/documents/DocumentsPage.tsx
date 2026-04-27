import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileText, Download } from 'lucide-react'
import { listMyOrders, type OrderResponse } from '../../api/ordersApi.ts'
import { downloadOrderReceipt, saveBlob } from '../../api/documentsApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

export default function DocumentsPage() {
  const { username } = useAuthStore()
  const [busyId, setBusyId] = useState<number | null>(null)

  const ordersQuery = useQuery({
    queryKey: ['my-orders', 0, 50],
    queryFn: () => listMyOrders({ size: 50 }),
  })

  const handleDownload = async (order: OrderResponse) => {
    try {
      setBusyId(order.id)
      const blob = await downloadOrderReceipt({
        orderId: order.id,
        customerName: username ?? undefined,
        shippingAddress: order.shippingAddress,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map((it) => ({
          sku: it.sku,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      })
      saveBlob(blob, `order-${order.id}-receipt.pdf`)
      toast.success(`Downloaded order #${order.id} receipt`)
    } catch {
      toast.error('Failed to download receipt')
    } finally {
      setBusyId(null)
    }
  }

  const orders = ordersQuery.data?.content ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
        <p className="text-xs text-slate-500">
          Download PDF receipts for your orders.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {ordersQuery.isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-slate-500">
                  <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                  No orders to generate documents for.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">#{o.id}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3">{o.items.length}</td>
                  <td className="px-4 py-3">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(o)}
                      disabled={busyId === o.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Download size={14} />
                      {busyId === o.id ? 'Generating…' : 'Receipt (PDF)'}
                    </button>
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

