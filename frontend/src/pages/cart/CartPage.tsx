import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2, Plus, ArrowLeft, ShoppingCart, CreditCard, Truck, Package } from 'lucide-react'
import { PaymentGateway } from '@aether/payment-gateway'
import type { PaymentResult } from '@aether/payment-gateway'
import {
  addCartItem, checkout, clearCart, getCart, removeCartItem, updateCartItem,
} from '../../api/cartApi.ts'
import { listProducts, type ProductResponse } from '../../api/inventoryApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { Spinner } from '../../components/ui/Spinner.tsx'

type Step = 'cart' | 'payment'
type PayMethod = 'card' | 'cod'

export default function CartPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const userIdNum = useAuthStore((s) => s.userIdNum)
  const username = useAuthStore((s) => s.username)
  const [step, setStep] = useState<Step>('cart')
  const [payMethod, setPayMethod] = useState<PayMethod>('card')
  const [shippingAddress, setShippingAddress] = useState('')
  const [addProductId, setAddProductId] = useState<number | ''>('')
  const [addQty, setAddQty] = useState<number>(1)

  const cartQuery = useQuery({
    queryKey: ['cart', userIdNum],
    queryFn: () => getCart(userIdNum!),
    enabled: userIdNum !== null,
  })

  const productsQuery = useQuery({
    queryKey: ['products', 'cart-lookup'],
    queryFn: () => listProducts({ page: 0, size: 200 }),
  })

  const productMap = new Map<number, ProductResponse>()
  productsQuery.data?.content?.forEach((p) => productMap.set(p.id, p))

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
    onSuccess: () => { toast.success('Cart cleared'); qc.invalidateQueries({ queryKey: ['cart', userIdNum] }) },
  })
  const checkoutMutation = useMutation({
    mutationFn: () => checkout(userIdNum!, { shippingAddress, idempotencyKey: crypto.randomUUID() }),
    onSuccess: (order) => {
      toast.success(`Order ${order.referenceNumber ?? `#${order.id}`} placed!`)
      qc.invalidateQueries({ queryKey: ['cart', userIdNum] })
      navigate(`/orders/${order.id}`)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Order creation failed')),
  })

  if (userIdNum === null) return <div className="text-slate-500 p-4">Cart unavailable. Please log out and log back in.</div>
  if (cartQuery.isLoading) return <Spinner label="Loading your cart…" />

  const items = cartQuery.data?.items ?? []
  const total = items.reduce((sum, it) => {
    const p = productMap.get(it.productId)
    return sum + (p ? Number(p.unitPrice) * it.quantity : 0)
  }, 0)

  const handleProceedToPayment = (e: FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return toast.error('Your cart is empty')
    if (!shippingAddress.trim()) return toast.error('Please enter a shipping address')
    setStep('payment')
  }

  const handlePaymentSuccess = (_result: PaymentResult) => checkoutMutation.mutate()
  const handlePaymentError = (error: Error) => toast.error(error.message || 'Payment failed — please try again')

  /* ── Payment step ── */
  if (step === 'payment') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setStep('cart')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={15} /> Back to cart
        </button>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Order summary — 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {items.map((it) => {
                  const p = productMap.get(it.productId)
                  const price = p ? Number(p.unitPrice) : 0
                  return (
                    <div key={it.productId} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{p?.name ?? `#${it.productId}`}</p>
                        <p className="text-xs text-slate-400">{p?.sku} × {it.quantity}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-700">${(price * it.quantity).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="text-lg font-bold text-slate-900">${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Shipping to</p>
              <p className="text-slate-700">{shippingAddress}</p>
            </div>
          </div>

          {/* Payment — 3 cols */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Payment Method</h2>

            {/* Method selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayMethod('card')}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition-all ${
                  payMethod === 'card'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <CreditCard size={22} />
                Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('cod')}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition-all ${
                  payMethod === 'cod'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Truck size={22} />
                Cash on Delivery
              </button>
            </div>

            {/* Card payment via gateway */}
            {payMethod === 'card' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {checkoutMutation.isPending ? (
                  <Spinner label="Confirming your order…" />
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
            )}

            {/* Cash on Delivery */}
            {payMethod === 'cod' && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900">Cash on Delivery</p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Pay in cash when your order arrives. No card details required.
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm text-emerald-700">
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> No upfront payment</li>
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Pay when order is delivered</li>
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Have exact change ready</li>
                </ul>
                <div className="rounded-xl bg-white/60 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-800">Amount due on delivery</span>
                  <span className="text-xl font-bold text-emerald-900">${total.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  disabled={checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate()}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {checkoutMutation.isPending ? 'Placing order…' : 'Place Order — Pay on Delivery'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Cart step ── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
          <p className="mt-0.5 text-sm text-slate-500">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
        </div>
        {items.length > 0 && (
          <button onClick={() => clearMutation.mutate()} className="text-sm text-red-500 hover:text-red-700 hover:underline">
            Clear cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse the shop and add items to your cart."
          action={<a href="/shop" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Browse Shop</a>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {items.map((it) => {
              const p = productMap.get(it.productId)
              const price = p ? Number(p.unitPrice) : 0
              return (
                <div key={it.productId} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <Package size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{p?.name ?? `#${it.productId}`}</p>
                    <p className="text-xs font-mono text-slate-400">{p?.sku} — ${price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateMutation.mutate({ userId: userIdNum, productId: it.productId, quantity: Number(e.target.value) })}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm font-medium"
                    />
                    <span className="hidden w-20 text-right text-sm font-semibold text-slate-700 sm:block">
                      ${(price * it.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeMutation.mutate({ productId: it.productId })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">Total</span>
            <span className="text-xl font-bold text-slate-900">${total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Add product */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Add a product</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-xs font-medium text-slate-500">Product</label>
            <select
              value={addProductId}
              onChange={(e) => setAddProductId(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— select a product —</option>
              {(productsQuery.data?.content ?? []).map((p: ProductResponse) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — ${Number(p.unitPrice).toFixed(2)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Qty</label>
            <input
              type="number"
              min={1}
              value={addQty}
              onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (addProductId === '') return toast.error('Pick a product first')
              addMutation.mutate({ userId: userIdNum, productId: addProductId, quantity: addQty })
            }}
            disabled={addMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={15} /> Add to Cart
          </button>
        </div>
      </div>

      {/* Checkout form */}
      {items.length > 0 && (
        <form onSubmit={handleProceedToPayment} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Checkout</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Shipping address</label>
            <input
              required
              placeholder="123 Main St, City, Country"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-lg font-bold text-slate-900">${total.toFixed(2)}</span>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            Proceed to Payment →
          </button>
        </form>
      )}
    </div>
  )
}
