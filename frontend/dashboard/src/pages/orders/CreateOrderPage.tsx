import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2, Plus } from 'lucide-react'
import { createOrder, type OrderItemRequest } from '../../api/ordersApi'
import { listProducts } from '../../api/inventoryApi'

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
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
    onError: () => toast.error('Failed to create order'),
  })

  const updateItem = (idx: number, patch: Partial<OrderItemRequest>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const handleSkuChange = (idx: number, sku: string) => {
    const product = productsQuery.data?.find((p) => p.sku === sku)
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Create order</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium text-slate-700">Shipping address</label>
          <input
            required
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Items</h2>
            <button
              type="button"
              onClick={() => setItems([...items, { sku: '', quantity: 1, unitPrice: 0 }])}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
            >
              <Plus size={14} /> Add item
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <select
                value={item.sku}
                onChange={(e) => handleSkuChange(idx, e.target.value)}
                required
                className="col-span-5 rounded-md border border-slate-300 px-2 py-2 text-sm"
              >
                <option value="">Select SKU…</option>
                {productsQuery.data?.map((p) => (
                  <option key={p.sku} value={p.sku}>{p.sku} — {p.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-sm"
                placeholder="Qty"
              />
              <input
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                className="col-span-3 rounded-md border border-slate-300 px-2 py-2 text-sm"
                placeholder="Unit price"
              />
              <button
                type="button"
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                className="col-span-1 flex items-center justify-center text-red-600 hover:text-red-800"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting…' : 'Create order'}
        </button>
      </form>
    </div>
  )
}

