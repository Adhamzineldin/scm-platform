import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  flexRender, getCoreRowModel, useReactTable, type ColumnDef,
} from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { Trash2, Plus, Search, Boxes, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { deleteProduct, listProducts, type ProductResponse } from '../../api/inventoryApi.ts'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { TableSkeleton } from '../../components/ui/Skeleton.tsx'

export default function InventoryPage() {
  const PAGE_SIZE = 20
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, PAGE_SIZE],
    queryFn: () => listProducts({ page, size: PAGE_SIZE }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: () => toast.error('Delete failed'),
  })

  const filtered = (data?.content ?? []).filter((p) => {
    const q = search.trim().toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  const columns = useMemo<ColumnDef<ProductResponse>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ getValue }) => (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Product Name',
        cell: ({ getValue }) => <span className="font-medium text-slate-800">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'unitPrice',
        header: 'Price',
        cell: ({ getValue }) => <span className="font-semibold text-indigo-600">${Number(getValue()).toFixed(2)}</span>,
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        cell: ({ getValue }) => <span className="font-medium text-slate-700">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'reorderLevel',
        header: 'Reorder At',
        cell: ({ getValue }) => <span className="text-slate-500">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'lowStock',
        header: 'Stock',
        cell: ({ getValue }) => getValue<boolean>() ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
            <AlertTriangle size={10} /> Low
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            OK
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link
              to={`/inventory/${row.original.id}`}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => { if (confirm(`Delete "${row.original.name}"?`)) deleteMutation.mutate(row.original.id) }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [deleteMutation],
  )

  const table = useReactTable({ data: filtered, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-0.5 text-sm text-slate-500">{data?.totalElements ?? 0} products total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 rounded-xl border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <Link
            to="/inventory/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus size={15} /> New Product
          </Link>
        </div>
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
                      <div className="h-4 w-24 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-4 flex-1 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-4 w-16 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-4 w-10 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-4 w-16 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-5 w-12 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-6 w-20 animate-pulse rounded-xl bg-slate-200" />
                    </div>
                  ))}
                </td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState icon={Boxes} title="No products" description={search ? `No results for "${search}"` : 'Create your first product.'} />
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

        {(data?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-700">{page + 1}</span> of {data?.totalPages ?? 1}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={data?.last ?? false}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
