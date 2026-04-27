import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createProduct, type ProductRequest } from '../../api/inventoryApi.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const empty: ProductRequest = {
  sku: '',
  name: '',
  description: '',
  unitPrice: 0,
  quantity: 0,
  reorderLevel: 0,
}

export default function CreateProductPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<ProductRequest>(empty)

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success(`Created ${p.sku}`)
      navigate('/inventory')
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create product')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  const set = <K extends keyof ProductRequest>(k: K, v: ProductRequest[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Create product</h1>

      <form onSubmit={handleSubmit} className="grid max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div className="md:col-span-1">
          <label className="text-sm font-medium text-slate-700">SKU</label>
          <input required value={form.sku} onChange={(e) => set('sku', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-1">
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
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

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating…' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  )
}

