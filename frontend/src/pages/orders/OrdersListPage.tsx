import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { listOrders, listMyOrders, type OrderResponse, type OrderStatus } from '../../api/ordersApi.ts'
import { useAuthStore } from '../../store/authStore.ts'

const STATUS_BADGE: Record<OrderStatus, string> = {
  VALIDATED: 'bg-indigo-50 text-indigo-700',
  PICKED: 'bg-sky-50 text-sky-700',
  SHIPPED: 'bg-amber-50 text-amber-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
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

  const columns = useMemo<ColumnDef<OrderResponse>[]>(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: 'Reference',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium text-slate-700">{getValue<string>() ?? '—'}</span>
        ),
      },
      ...(!isCustomer ? [{ accessorKey: 'userId', header: 'User' } as ColumnDef<OrderResponse>] : []),
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue<OrderStatus>()
          return (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s]}`}>
              {s}
            </span>
          )
        },
      },
      { accessorKey: 'shippingAddress', header: 'Shipping address' },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Link to={`/orders/${row.original.id}`} className="text-indigo-600 hover:underline">
            View
          </Link>
        ),
      },
    ],
    [isCustomer],
  )

  const table = useReactTable({
    data: data?.content ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          {isCustomer ? 'My Orders' : 'Orders'}
        </h1>
        {!isCustomer && (
          <Link
            to="/orders/new"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New order
          </Link>
        )}
        {isCustomer && (
          <Link
            to="/cart"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Go to cart
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={columns.length} className="p-6 text-center text-slate-500">Loading…</td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-slate-500">
                  {isCustomer ? (
                    <>No orders yet. <Link to="/shop" className="text-indigo-600 hover:underline">Browse the shop</Link> to place your first order.</>
                  ) : 'No orders'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
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

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page + 1} of {data?.totalPages ?? 1} — {data?.totalElements ?? 0} orders
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={data?.last ?? false}
            className="rounded border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
