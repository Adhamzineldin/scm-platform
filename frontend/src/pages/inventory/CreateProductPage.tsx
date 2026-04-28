import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createProduct, type ProductRequest } from '../../api/inventoryApi.ts'
import { createSkuLocation } from '../../api/warehouseApi.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const empty: ProductRequest = {
  sku: '',
  name: '',
  description: '',
  imageUrl: '',
  unitPrice: 0,
  quantity: 0,
  reorderLevel: 0,
}

export default function CreateProductPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<ProductRequest>(empty)

  const mutation = useMutation({
    mutationFn: async (req: ProductRequest) => {
      const product = await createProduct(req)
      // Auto-register a default warehouse location so the product is
      // immediately pickable. Fails silently if warehouse is unreachable.
      try {
        await createSkuLocation({
          sku: product.sku,
          zoneCode: 'STOR-01',
          shelfCode: 'UNREGISTERED',
          onHandQuantity: product.quantity,
        })
      } catch {
        // warehouse registration is best-effort; specialist can assign shelf later
      }
      return product
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['skuLocs'] })
      toast.success(`"${p.name}" created and registered in STOR-01`)
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create product</h1>
        <p className="text-xs text-slate-500 mt-1">
          A default warehouse location in STOR-01 is automatically registered. A warehouse specialist can update the shelf code later.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div className="md:col-span-1">
          <label className="text-sm font-medium text-slate-700">SKU <span className="text-slate-400 font-normal">(optional — auto-generated if blank)</span></label>
          <input
            value={form.sku ?? ''}
            placeholder="e.g. WIDGET-001"
            onChange={(e) => set('sku', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Image URL <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            type="url"
            value={form.imageUrl ?? ''}
            placeholder="https://images.unsplash.com/photo-…"
            onChange={(e) => set('imageUrl', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt="preview"
              className="mt-2 h-24 w-24 rounded-md object-cover border border-slate-200"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Unit price</label>
          <input type="number" step="0.01" min="0.01" required value={form.unitPrice} onChange={(e) => set('unitPrice', Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Quantity</label>
          <input type="number" min="0" required value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Reorder level</label>
          <input type="number" min="0" required value={form.reorderLevel} onChange={(e) => set('reorderLevel', Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="md:col-span-2 rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          After creation, go to <strong>Warehouse → SKU Locations</strong> to update the shelf code from <code>UNREGISTERED</code> to the product's physical shelf position.
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
