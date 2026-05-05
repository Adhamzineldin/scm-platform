import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { deleteProduct, listProducts, type ProductResponse } from '../../api/inventoryApi.ts'

export default function InventoryPage() {
  const PAGE_SIZE = 20
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['products', page, PAGE_SIZE],
    queryFn: () => listProducts({ page, size: PAGE_SIZE }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Delete failed'),
  })

  const columns = useMemo<ColumnDef<ProductResponse>[]>(
    () => [
      { accessorKey: 'sku', header: 'SKU' },
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'unitPrice',
        header: 'Price',
        cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}`,
      },
      { accessorKey: 'quantity', header: 'Qty' },
      { accessorKey: 'reorderLevel', header: 'Reorder' },
      {
        accessorKey: 'lowStock',
        header: 'Stock',
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Low</span>
          ) : (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">OK</span>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Link to={`/inventory/${row.original.id}`} className="text-indigo-600 hover:underline">View</Link>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete ${row.original.sku}?`)) deleteMutation.mutate(row.original.id)
              }}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    [deleteMutation],
  )

  const table = useReactTable({
    data: data?.content ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
        <Link
          to="/inventory/new"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New product
        </Link>
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
              <tr><td colSpan={columns.length} className="p-6 text-center text-slate-500">No products</td></tr>
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
        {(data?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>
              Page {page + 1} of {data?.totalPages ?? 1} ({data?.totalElements ?? 0} products)
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
                disabled={data?.last ?? false}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

