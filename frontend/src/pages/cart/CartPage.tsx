import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2, Plus } from 'lucide-react'
import {
  addCartItem,
  checkout,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../../api/cartApi.ts'
import { listProducts, type ProductResponse } from '../../api/inventoryApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

export default function CartPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const userIdNum = useAuthStore((s) => s.userIdNum)
  const [shippingAddress, setShippingAddress] = useState('')
  const [addProductId, setAddProductId] = useState<number | ''>('')
  const [addQty, setAddQty] = useState<number>(1)

  const cartQuery = useQuery({
    queryKey: ['cart', userIdNum],
    queryFn: () => getCart(userIdNum!),
    enabled: userIdNum !== null,
  })

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const productMap = new Map<number, ProductResponse>()
  productsQuery.data?.forEach((p) => productMap.set(p.id, p))

  const updateMutation = useMutation({
    mutationFn: updateCartItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', userIdNum] }),
    onError: () => toast.error('Update failed'),
  })

  const addMutation = useMutation({
    mutationFn: addCartItem,
    onSuccess: () => {
      toast.success('Added to cart')
      qc.invalidateQueries({ queryKey: ['cart', userIdNum] })
      setAddProductId('')
      setAddQty(1)
    },
    onError: () => toast.error('Add failed'),
  })

  const removeMutation = useMutation({
    mutationFn: ({ productId }: { productId: number }) => removeCartItem(userIdNum!, productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', userIdNum] }),
    onError: () => toast.error('Remove failed'),
  })

  const clearMutation = useMutation({
    mutationFn: () => clearCart(userIdNum!),
    onSuccess: () => {
      toast.success('Cart cleared')
      qc.invalidateQueries({ queryKey: ['cart', userIdNum] })
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: () =>
      checkout(userIdNum!, { shippingAddress, idempotencyKey: crypto.randomUUID() }),
    onSuccess: (order) => {
      toast.success(`Order #${order.id} created`)
      qc.invalidateQueries({ queryKey: ['cart', userIdNum] })
      navigate(`/orders/${order.id}`)
    },
    onError: () => toast.error('Checkout failed'),
  })

  if (userIdNum === null) {
    return <div className="text-slate-500">Cart unavailable: missing user id.</div>
  }
  if (cartQuery.isLoading) return <div className="text-slate-500">Loading…</div>

  const items = cartQuery.data?.items ?? []
  const total = items.reduce((sum, it) => {
    const p = productMap.get(it.productId)
    return sum + (p ? Number(p.unitPrice) * it.quantity : 0)
  }, 0)

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }
    checkoutMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Cart</h1>
        {items.length > 0 && (
          <button
            onClick={() => clearMutation.mutate()}
            className="text-sm text-red-600 hover:underline"
          >
            Clear cart
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">Cart is empty</td></tr>
            ) : (
              items.map((it) => {
                const p = productMap.get(it.productId)
                const price = p ? Number(p.unitPrice) : 0
                return (
                  <tr key={it.productId} className="border-t border-slate-100">
                    <td className="px-4 py-3">{p ? `${p.sku} — ${p.name}` : `#${it.productId}`}</td>
                    <td className="px-4 py-3">${price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) =>
                          updateMutation.mutate({
                            userId: userIdNum,
                            productId: it.productId,
                            quantity: Number(e.target.value),
                          })
                        }
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">${(price * it.quantity).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeMutation.mutate({ productId: it.productId })}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total</td>
                <td className="px-4 py-3 font-semibold">${total.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500">Product</label>
          <select
            value={addProductId}
            onChange={(e) => setAddProductId(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— select —</option>
            {(productsQuery.data ?? []).map((p: ProductResponse) => (
              <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500">Qty</label>
          <input
            type="number"
            min={1}
            value={addQty}
            onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))}
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (addProductId === '') return toast.error('Pick a product first')
            addMutation.mutate({ userId: userIdNum, productId: addProductId, quantity: addQty })
          }}
          disabled={addMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={14} /> Add to cart
        </button>
      </div>

      <form onSubmit={handleCheckout} className="max-w-xl space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Checkout</h2>
        <input
          required
          placeholder="Shipping address"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={checkoutMutation.isPending || items.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {checkoutMutation.isPending ? 'Processing…' : 'Place order'}
        </button>
      </form>
    </div>
  )
}

