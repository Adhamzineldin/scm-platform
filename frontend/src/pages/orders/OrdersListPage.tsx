import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender, getCoreRowModel, useReactTable, type ColumnDef,
} from '@tanstack/react-table'
import { Plus, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { listOrders, listMyOrders, type OrderResponse, type OrderStatus } from '../../api/ordersApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { displayUser, useUserNames } from '../../hooks/useUserNames.ts'
import { EmptyState } from '../../components/ui/EmptyState.tsx'

const STATUS_STYLE: Record<OrderStatus, { label: string; cls: string }> = {
  VALIDATED:  { label: 'Validated',  cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  PICKED:     { label: 'Picked',     cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  DISPATCHED: { label: 'Dispatched', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  SHIPPED:    { label: 'Shipped',    cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  DELIVERED:  { label: 'Delivered',  cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-red-50 text-red-700 ring-red-200' },
}

export default function OrdersListPage() {
  const [page, setPage] = useState(0)
  const size = 20
  const role = useAuthStore((s) => s.role)
  const isCustomer = role === 'CUSTOMER'

  const { data, isLoading } = useQuery({
    queryKey: isCustomer ? ['my-orders', page, size] : ['orders', page, size],
    queryFn: () => isCustomer ? listMyOrders({ page, size }) : listOrders({ page, size }),
  })

  const orders = data?.content ?? []
  const userNames = useUserNames(orders.map((o) => o.userId))

  const columns = useMemo<ColumnDef<OrderResponse>[]>(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: 'Reference',
        cell: ({ getValue }) => (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
            {getValue<string>() ?? '—'}
          </span>
        ),
      },
      ...(!isCustomer ? [{
        accessorKey: 'userId',
        header: 'Customer',
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-700">{displayUser(getValue<string>(), userNames)}</span>
        ),
      } as ColumnDef<OrderResponse>] : []),
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue<OrderStatus>()
          const style = STATUS_STYLE[s] ?? { label: s, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.cls}`}>
              {style.label}
            </span>
          )
        },
      },
      {
        accessorKey: 'shippingAddress',
        header: 'Shipping Address',
        cell: ({ getValue }) => (
          <span className="max-w-[200px] truncate text-sm text-slate-600">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Placed',
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-500">
            {new Date(getValue<string>()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Link
            to={`/orders/${row.original.id}`}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            View
          </Link>
        ),
      },
    ],
    [isCustomer, userNames],
  )

  const table = useReactTable({ data: orders, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isCustomer ? 'My Orders' : 'Orders'}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{data?.totalElements ?? 0} total orders</p>
        </div>
        {isCustomer ? (
          <Link to="/cart" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            <ShoppingBag size={15} /> Go to Cart
          </Link>
        ) : (
          <Link to="/orders/new" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            <Plus size={15} /> New Order
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {table.getFlatHeaders().map((h) => (
                  <th key={h.id} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={columns.length} className="py-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
                      <div className="h-4 w-28 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-4 flex-1 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-4 w-24 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-6 w-16 animate-pulse rounded-xl bg-slate-200" />
                    </div>
                  ))}
                </td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      icon={ShoppingBag}
                      title="No orders yet"
                      description={isCustomer ? 'Place your first order from the shop.' : 'No orders in the system.'}
                      action={isCustomer ? <Link to="/shop" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Browse Shop</Link> : undefined}
                    />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-700">{page + 1}</span> of {data?.totalPages ?? 1}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={data?.last ?? false}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
