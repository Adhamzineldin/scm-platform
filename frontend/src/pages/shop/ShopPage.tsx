import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShoppingCart, Search, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listProducts, type ProductResponse } from '../../api/inventoryApi.ts'
import { addCartItem } from '../../api/cartApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'
import { Spinner } from '../../components/ui/Spinner.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'

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
    (p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
  )

  const totalPages = productsQuery.data?.totalPages ?? 1
  const totalElements = productsQuery.data?.totalElements ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shop</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {totalElements > 0 ? `${totalElements} products available` : 'Browse our catalogue'}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Go to cart shortcut */}
      <div className="flex justify-end">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          <ShoppingCart size={15} /> View Cart
        </Link>
      </div>

      {/* Grid */}
      {productsQuery.isLoading ? (
        <Spinner label="Loading products…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description={search ? `No results for "${search}"` : 'No products in the catalogue yet.'} />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-sm text-slate-500">
                Page <span className="font-medium text-slate-700">{page + 1}</span> of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={productsQuery.data?.last ?? false}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductCard({ product, onAddToCart, disabled }: {
  product: ProductResponse
  onAddToCart: () => void
  disabled: boolean
}) {
  const outOfStock = product.quantity === 0
  const lowStock = product.lowStock && !outOfStock

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package size={40} />
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">Out of Stock</span>
          </div>
        )}
        {lowStock && (
          <div className="absolute right-2 top-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
              Low Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-mono text-slate-400">{product.sku}</p>
        <h3 className="mt-0.5 font-semibold text-slate-900 leading-snug">{product.name}</h3>
        {product.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{product.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <span className="text-xl font-bold text-indigo-600">${Number(product.unitPrice).toFixed(2)}</span>
            {!outOfStock && (
              <span className="ml-2 text-[11px] text-slate-400">{product.quantity} in stock</span>
            )}
          </div>
          <button
            onClick={onAddToCart}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <ShoppingCart size={13} /> Add
          </button>
        </div>
      </div>
    </div>
  )
}
