import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Package, AlertTriangle, CheckCircle2, Save } from 'lucide-react'
import { getProduct, updateProduct, type ProductRequest } from '../../api/inventoryApi.ts'

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100'

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
        imageUrl: data.imageUrl,
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
      toast.success('Product saved')
    },
    onError: () => toast.error('Update failed'),
  })

  if (isLoading || !form || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading product…
        </div>
      </div>
    )
  }

  const set = <K extends keyof ProductRequest>(k: K, v: ProductRequest[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (form) mutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/inventory"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-slate-900">{data.name}</h1>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{data.sku}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${data.lowStock ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
          {data.lowStock
            ? <><AlertTriangle size={11} /> Low stock</>
            : <><CheckCircle2 size={11} /> In stock</>
          }
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid max-w-2xl gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">

        <Field label="SKU" hint="Unique identifier">
          <input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)} className={inputCls} />
        </Field>

        <Field label="Product Name">
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
        </Field>

        <div className="md:col-span-2">
          <Field label="Description" hint="Optional">
            <textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Image URL" hint="Optional">
            <input
              type="url"
              value={form.imageUrl ?? ''}
              placeholder="https://…"
              onChange={(e) => set('imageUrl', e.target.value)}
              className={inputCls}
            />
            {form.imageUrl && (
              <div className="mt-2">
                <img
                  src={form.imageUrl}
                  alt="preview"
                  className="h-24 w-24 rounded-xl border border-slate-200 object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </Field>
        </div>

        <Field label="Unit Price ($)">
          <input type="number" step="0.01" min="0.01" required value={form.unitPrice} onChange={(e) => set('unitPrice', Number(e.target.value))} className={inputCls} />
        </Field>

        <Field label="Quantity">
          <input type="number" min="0" required value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} className={inputCls} />
        </Field>

        <Field label="Reorder Level" hint="Triggers low-stock alert">
          <input type="number" min="0" required value={form.reorderLevel} onChange={(e) => set('reorderLevel', Number(e.target.value))} className={inputCls} />
        </Field>

        <div className="md:col-span-2 flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={15} />
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <Link to="/inventory" className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
            Cancel
          </Link>
        </div>
      </form>

      {/* Quick stats */}
      <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Unit Price</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${Number(data.unitPrice).toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">In Stock</p>
          <p className={`mt-1 text-xl font-bold ${data.lowStock ? 'text-red-600' : 'text-emerald-600'}`}>{data.quantity}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Reorder At</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{data.reorderLevel}</p>
        </div>
      </div>
    </div>
  )
}
