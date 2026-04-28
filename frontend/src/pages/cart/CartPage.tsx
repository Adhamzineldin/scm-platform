import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2, Plus, ArrowLeft } from 'lucide-react'
import { PaymentGateway } from '@aether/payment-gateway'
import '@aether/payment-gateway/dist/style.css'
import type { PaymentResult } from '@aether/payment-gateway'
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
import { extractErrorMessage } from '../../api/axiosInstance.ts'

type Step = 'cart' | 'payment'

export default function CartPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const userIdNum = useAuthStore((s) => s.userIdNum)
  const username = useAuthStore((s) => s.username)
  const [step, setStep] = useState<Step>('cart')
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
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to update item')),
  })

  const addMutation = useMutation({
    mutationFn: addCartItem,
    onSuccess: () => {
      toast.success('Added to cart')
      qc.invalidateQueries({ queryKey: ['cart', userIdNum] })
      setAddProductId('')
      setAddQty(1)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to add item')),
  })

  const removeMutation = useMutation({
    mutationFn: ({ productId }: { productId: number }) => removeCartItem(userIdNum!, productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', userIdNum] }),
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to remove item')),
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
      toast.success(`Order ${order.referenceNumber ?? `#${order.id}`} placed`)
      qc.invalidateQueries({ queryKey: ['cart', userIdNum] })
      navigate(`/orders/${order.id}`)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Order creation failed')),
  })

  if (userIdNum === null) {
    return <div className="text-slate-500">Cart unavailable: missing user session. Please log out and log back in.</div>
  }
  if (cartQuery.isLoading) return <div className="text-slate-500">Loading…</div>

  const items = cartQuery.data?.items ?? []
  const total = items.reduce((sum, it) => {
    const p = productMap.get(it.productId)
    return sum + (p ? Number(p.unitPrice) * it.quantity : 0)
  }, 0)

  const handleProceedToPayment = (e: FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return toast.error('Cart is empty')
    if (!shippingAddress.trim()) return toast.error('Please enter a shipping address')
    setStep('payment')
  }

  const handlePaymentSuccess = (_result: PaymentResult) => {
    checkoutMutation.mutate()
  }

  const handlePaymentError = (error: Error) => {
    toast.error(error.message || 'Payment failed — please try again')
  }

  if (step === 'payment') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('cart')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Back to cart
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Order summary */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const p = productMap.get(it.productId)
                    const price = p ? Number(p.unitPrice) : 0
                    return (
                      <tr key={it.productId} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p?.name ?? `#${it.productId}`}</div>
                          <div className="text-xs text-slate-400">{p?.sku} × {it.quantity}</div>
                        </td>
                        <td className="px-4 py-3 text-right">${(price * it.quantity).toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">${total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Shipping to</p>
              <p className="text-slate-700">{shippingAddress}</p>
            </div>
          </div>

          {/* Payment gateway */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment</h2>
            {checkoutMutation.isPending ? (
              <div className="flex items-center justify-center h-48 text-slate-500">
                Confirming your order…
              </div>
            ) : (
              <PaymentGateway
                amount={total}
                currency="USD"
                orderId={`CART-${userIdNum}`}
                customerEmail={username ?? undefined}
                methods={['card', 'bank_transfer']}
                sandbox
                theme="light"
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={() => setStep('cart')}
              />
            )}
          </div>
        </div>
      </div>
    )
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
                    <td className="px-4 py-3">
                      <div className="font-medium">{p?.name ?? `#${it.productId}`}</div>
                      <div className="text-xs text-slate-400 font-mono">{p?.sku}</div>
                    </td>
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
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-700">Total</td>
                <td className="px-4 py-3 font-bold text-slate-900">${total.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add product row */}
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
              <option key={p.id} value={p.id}>{p.name} ({p.sku}) — ${Number(p.unitPrice).toFixed(2)}</option>
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

      {/* Checkout */}
      <form onSubmit={handleProceedToPayment} className="max-w-xl space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
          disabled={items.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Proceed to payment →
        </button>
      </form>
    </div>
  )
}
