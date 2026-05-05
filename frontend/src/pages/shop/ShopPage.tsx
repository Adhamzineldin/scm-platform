import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShoppingCart } from 'lucide-react'
import { listProducts, type ProductResponse } from '../../api/inventoryApi.ts'
import { addCartItem } from '../../api/cartApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

export default function ShopPage() {
  const PAGE_SIZE = 24
  const qc = useQueryClient()
  const userIdNum = useAuthStore((s) => s.userIdNum)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const productsQuery = useQuery({
    queryKey: ['shop-products', page, PAGE_SIZE],
    queryFn: () => listProducts({ page, size: PAGE_SIZE }),
  })

  const addMutation = useMutation({
    mutationFn: (product: ProductResponse) =>
      addCartItem({ userId: userIdNum!, productId: product.id, quantity: 1 }),
    onSuccess: (_data, product) => {
      toast.success(`"${product.name}" added to cart`)
      qc.invalidateQueries({ queryKey: ['cart', userIdNum] })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to add to cart')),
  })

  const q = search.trim().toLowerCase()
  const filtered = (productsQuery.data?.content ?? []).filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Shop</h1>
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {productsQuery.isLoading ? (
        <p className="text-slate-500">Loading products…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500">No products found.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={() => addMutation.mutate(p)}
              disabled={addMutation.isPending || userIdNum === null || p.quantity === 0}
            />
          ))}
          </div>
          {(productsQuery.data?.totalPages ?? 1) > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page + 1} of {productsQuery.data?.totalPages ?? 1} ({productsQuery.data?.totalElements ?? 0} products)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={productsQuery.data?.last ?? false}
                  className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductCard({
  product,
  onAddToCart,
  disabled,
}: {
  product: ProductResponse
  onAddToCart: () => void
  disabled: boolean
}) {
  const outOfStock = product.quantity === 0

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-40 w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="h-40 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
          No image
        </div>
      )}

      <div className="flex flex-col flex-1 p-4 gap-2">
        <div>
          <p className="text-xs text-slate-400 font-mono">{product.sku}</p>
          <h3 className="font-semibold text-slate-900 text-sm leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <span className="text-lg font-bold text-indigo-600">
              ${Number(product.unitPrice).toFixed(2)}
            </span>
            {outOfStock ? (
              <span className="ml-2 text-xs text-red-500">Out of stock</span>
            ) : (
              <span className="ml-2 text-xs text-slate-400">{product.quantity} left</span>
            )}
          </div>

          <button
            onClick={onAddToCart}
            disabled={disabled || outOfStock}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <ShoppingCart size={12} />
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
