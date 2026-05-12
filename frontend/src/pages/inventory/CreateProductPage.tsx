import { type FormEvent, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Package, Info } from 'lucide-react'
import { createProduct, type ProductRequest } from '../../api/inventoryApi.ts'
import { createSkuLocation } from '../../api/warehouseApi.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const empty: ProductRequest = {
  sku: '', name: '', description: '', imageUrl: '', unitPrice: 0, quantity: 0, reorderLevel: 0,
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function CreateProductPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<ProductRequest>(empty)

  const mutation = useMutation({
    mutationFn: async (req: ProductRequest) => {
      const product = await createProduct(req)
      try {
        await createSkuLocation({ sku: product.sku, zoneCode: 'STOR-01', shelfCode: 'UNREGISTERED', onHandQuantity: product.quantity })
      } catch { /* warehouse registration is best-effort */ }
      return product
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['skuLocs'] })
      toast.success(`"${p.name}" created`)
      navigate('/inventory')
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create product')),
  })

  const set = <K extends keyof ProductRequest>(k: K, v: ProductRequest[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/inventory" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Product</h1>
          <p className="text-sm text-slate-500">Fill in the details below to add a product to inventory.</p>
        </div>
      </div>

      <form
        onSubmit={(e: FormEvent) => { e.preventDefault(); mutation.mutate(form) }}
        className="grid max-w-2xl gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <Field label="SKU" hint="Optional — auto-generated if blank">
          <input value={form.sku ?? ''} placeholder="e.g. WIDGET-001" onChange={(e) => set('sku', e.target.value)} className={inputCls} />
        </Field>

        <Field label="Product Name">
          <input required value={form.name} placeholder="e.g. Blue Widget" onChange={(e) => set('name', e.target.value)} className={inputCls} />
        </Field>

        <div className="md:col-span-2">
          <Field label="Description" hint="Optional">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Brief description of the product…" className={`${inputCls} resize-none`} />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Image URL" hint="Optional">
            <input type="url" value={form.imageUrl ?? ''} placeholder="https://…" onChange={(e) => set('imageUrl', e.target.value)} className={inputCls} />
            {form.imageUrl && (
              <div className="mt-2">
                <img src={form.imageUrl} alt="preview" className="h-24 w-24 rounded-xl border border-slate-200 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </Field>
        </div>

        <Field label="Unit Price ($)">
          <input type="number" step="0.01" min="0.01" required value={form.unitPrice} onChange={(e) => set('unitPrice', Number(e.target.value))} className={inputCls} />
        </Field>

        <Field label="Initial Quantity">
          <input type="number" min="0" required value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} className={inputCls} />
        </Field>

        <Field label="Reorder Level" hint="Triggers low-stock alert">
          <input type="number" min="0" required value={form.reorderLevel} onChange={(e) => set('reorderLevel', Number(e.target.value))} className={inputCls} />
        </Field>

        <div className="md:col-span-2">
          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Info size={15} className="mt-0.5 shrink-0" />
            <span>A default warehouse location in <strong>STOR-01</strong> is registered automatically. A warehouse specialist can update the shelf code later.</span>
          </div>
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Package size={15} />
            {mutation.isPending ? 'Creating…' : 'Create Product'}
          </button>
          <Link to="/inventory" className="text-sm text-slate-500 hover:text-slate-800 hover:underline">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
