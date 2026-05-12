import { type FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2, Plus, ArrowLeft, ShoppingBag, MapPin } from 'lucide-react'
import { createOrder, type OrderItemRequest } from '../../api/ordersApi.ts'
import { listProducts } from '../../api/inventoryApi.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100'

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const productsQuery = useQuery({
    queryKey: ['products', 'order-create', 0, 200],
    queryFn: () => listProducts({ page: 0, size: 200 }),
  })
  const [shippingAddress, setShippingAddress] = useState('')
  const [items, setItems] = useState<OrderItemRequest[]>([
    { sku: '', quantity: 1, unitPrice: 0 },
  ])

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      toast.success(`Order #${order.id} created`)
      navigate(`/orders/${order.id}`)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create order')),
  })

  const updateItem = (idx: number, patch: Partial<OrderItemRequest>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const handleSkuChange = (idx: number, sku: string) => {
    const product = productsQuery.data?.content?.find((p) => p.sku === sku)
    updateItem(idx, { sku, unitPrice: product ? Number(product.unitPrice) : 0 })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      idempotencyKey: crypto.randomUUID(),
      shippingAddress,
      items,
    })
  }

  const orderTotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/orders"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Order</h1>
          <p className="text-sm text-slate-500">Fill in the shipping address and add line items below.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        {/* Shipping address */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPin size={15} className="text-indigo-500" />
            Shipping Address
          </div>
          <textarea
            required
            rows={3}
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Street address, city, postal code, country…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShoppingBag size={15} className="text-indigo-500" />
              Order Items
            </div>
            <button
              type="button"
              onClick={() => setItems([...items, { sku: '', quantity: 1, unitPrice: 0 }])}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <Plus size={13} /> Add item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 rounded-xl bg-slate-50 p-3">
                <select
                  value={item.sku}
                  onChange={(e) => handleSkuChange(idx, e.target.value)}
                  required
                  className="col-span-5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select product…</option>
                  {productsQuery.data?.content?.map((p) => (
                    <option key={p.sku} value={p.sku}>{p.sku} — {p.name}</option>
                  ))}
                </select>
                <div className="col-span-3">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Price"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  disabled={items.length === 1}
                  className="col-span-1 flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="flex items-center justify-end rounded-xl bg-slate-100 px-4 py-2.5 text-sm">
              <span className="text-slate-500 mr-2">Estimated total</span>
              <span className="font-bold text-slate-900">${orderTotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <ShoppingBag size={15} />
            {mutation.isPending ? 'Placing order…' : 'Place Order'}
          </button>
          <Link to="/orders" className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
