import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getProduct, updateProduct, type ProductRequest } from '../../api/inventoryApi.ts'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id!),
    enabled: !!id,
  })

  const [form, setForm] = useState<ProductRequest | null>(null)

  useEffect(() => {
    if (data) {
      setForm({
        sku: data.sku,
        name: data.name,
        description: data.description,
        unitPrice: Number(data.unitPrice),
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (body: ProductRequest) => updateProduct(Number(id), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Saved')
    },
    onError: () => toast.error('Update failed'),
  })

  if (isLoading || !form || !data) return <div className="text-slate-500">Loading…</div>

  const set = <K extends keyof ProductRequest>(k: K, v: ProductRequest[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (form) mutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
        <Link to="/inventory" className="text-sm text-indigo-600 hover:underline">← Back</Link>
      </div>

      <form onSubmit={handleSubmit} className="grid max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">SKU</label>
          <input value={form.sku} onChange={(e) => set('sku', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Unit price</label>
          <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => set('unitPrice', Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Quantity</label>
          <input type="number" value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Reorder level</label>
          <input type="number" value={form.reorderLevel} onChange={(e) => set('reorderLevel', Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="md:col-span-2 flex items-center justify-between">
          <span className={`text-xs font-medium ${data.lowStock ? 'text-red-600' : 'text-emerald-600'}`}>
            {data.lowStock ? 'Low stock' : 'Stock OK'}
          </span>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

