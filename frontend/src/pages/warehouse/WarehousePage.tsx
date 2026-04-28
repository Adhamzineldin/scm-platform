import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MapPin, Package, Layers, Plus } from 'lucide-react'
import {
  completePickingTask,
  createSkuLocation,
  createZone,
  listPickingTasks,
  listSkuLocations,
  listZones,
  startPickingTask,
  type SkuLocationRequest,
  type TaskStatus,
  type WarehouseZoneRequest,
  type ZoneType,
} from '../../api/warehouseApi.ts'
import { listProducts } from '../../api/inventoryApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const TASK_BADGE: Record<TaskStatus, string> = {
  PENDING:     'bg-amber-50 text-amber-700 border border-amber-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  COMPLETED:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED:   'bg-red-50 text-red-700 border border-red-200',
}

const ZONE_TYPE_BADGE: Record<string, string> = {
  RECEIVING: 'bg-sky-50 text-sky-700',
  STORAGE:   'bg-violet-50 text-violet-700',
  PICKING:   'bg-amber-50 text-amber-700',
  PACKING:   'bg-orange-50 text-orange-700',
  SHIPPING:  'bg-emerald-50 text-emerald-700',
  STAGING:   'bg-slate-100 text-slate-600',
}

const ALL_ZONE_TYPES: ZoneType[] = ['RECEIVING', 'STORAGE', 'PICKING', 'PACKING', 'SHIPPING', 'STAGING']
const EMPTY_ZONE: WarehouseZoneRequest = { code: '', name: '', type: 'STORAGE', description: '' }

type Tab = 'tasks' | 'locations' | 'zones'

const EMPTY_LOC: SkuLocationRequest = { sku: '', zoneCode: '', shelfCode: '', onHandQuantity: 0 }

export default function WarehousePage() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.userId)
  const [tab, setTab] = useState<Tab>('tasks')
  const [taskFilter, setTaskFilter] = useState<TaskStatus | 'ALL'>('ALL')
  const [showLocForm, setShowLocForm] = useState(false)
  const [locForm, setLocForm] = useState<SkuLocationRequest>(EMPTY_LOC)
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [zoneForm, setZoneForm] = useState<WarehouseZoneRequest>(EMPTY_ZONE)

  const zonesQuery    = useQuery({ queryKey: ['zones'],    queryFn: listZones })
  const locsQuery     = useQuery({ queryKey: ['skuLocs'],  queryFn: listSkuLocations })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const tasksQuery    = useQuery({
    queryKey: ['pickingTasks', taskFilter],
    queryFn: () => listPickingTasks(taskFilter === 'ALL' ? undefined : taskFilter),
    refetchInterval: 15_000,
  })

  const startMut = useMutation({
    mutationFn: ({ id }: { id: number }) => startPickingTask(id, userId ?? 'unknown'),
    onSuccess: () => { toast.success('Task started'); qc.invalidateQueries({ queryKey: ['pickingTasks'] }) },
    onError:   (err) => toast.error(extractErrorMessage(err, 'Failed to start task')),
  })

  const completeMut = useMutation({
    mutationFn: ({ id }: { id: number }) => completePickingTask(id, userId ?? 'unknown'),
    onSuccess: () => { toast.success('Task completed — order status updated'); qc.invalidateQueries({ queryKey: ['pickingTasks'] }) },
    onError:   (err) => toast.error(extractErrorMessage(err, 'Failed to complete task')),
  })

  const addLocMut = useMutation({
    mutationFn: createSkuLocation,
    onSuccess: () => {
      toast.success('Location registered')
      qc.invalidateQueries({ queryKey: ['skuLocs'] })
      setLocForm(EMPTY_LOC)
      setShowLocForm(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to register location')),
  })

  const addZoneMut = useMutation({
    mutationFn: createZone,
    onSuccess: () => {
      toast.success('Zone created')
      qc.invalidateQueries({ queryKey: ['zones'] })
      setZoneForm(EMPTY_ZONE)
      setShowZoneForm(false)
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to create zone')),
  })

  const busy = startMut.isPending || completeMut.isPending

  const tasks    = tasksQuery.data ?? []
  const pending  = tasks.filter((t) => t.status === 'PENDING').length
  const inProg   = tasks.filter((t) => t.status === 'IN_PROGRESS').length

  // SKU → product name lookup (so workers see what they're picking, not just a SKU code)
  const productBySku: Record<string, string> = {}
  for (const p of (productsQuery.data ?? [])) productBySku[p.sku] = p.name

  const handleAddLoc = (e: FormEvent) => {
    e.preventDefault()
    addLocMut.mutate({ ...locForm, onHandQuantity: Number(locForm.onHandQuantity) })
  }

  const handleAddZone = (e: FormEvent) => {
    e.preventDefault()
    addZoneMut.mutate(zoneForm)
  }

  const TAB_CLASSES = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Warehouse</h1>
          <p className="mt-1 text-sm text-slate-500">Manage SKU locations, process picking tasks, oversee zones</p>
        </div>
        {(pending > 0 || inProg > 0) && (
          <div className="flex gap-2">
            {pending > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                {pending} pending
              </span>
            )}
            {inProg > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                {inProg} in progress
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1">
          <button onClick={() => setTab('tasks')} className={TAB_CLASSES(tab === 'tasks')}>
            <span className="flex items-center gap-1.5"><Package size={15} />Picking tasks</span>
          </button>
          <button onClick={() => setTab('locations')} className={TAB_CLASSES(tab === 'locations')}>
            <span className="flex items-center gap-1.5"><MapPin size={15} />SKU locations</span>
          </button>
          <button onClick={() => setTab('zones')} className={TAB_CLASSES(tab === 'zones')}>
            <span className="flex items-center gap-1.5"><Layers size={15} />Zones</span>
          </button>
        </nav>
      </div>

      {/* ── Picking Tasks ── */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Auto-refreshes every 15 s. Complete all tasks for an order to automatically mark it as Picked.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter:</span>
              {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setTaskFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    taskFilter === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tasksQuery.isLoading ? (
                  <tr><td colSpan={9} className="p-6 text-center text-slate-400">Loading…</td></tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center">
                      <Package size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">No tasks{taskFilter !== 'ALL' ? ` with status ${taskFilter}` : ''}.</p>
                      {taskFilter === 'ALL' && locsQuery.data?.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">No SKU locations registered — tasks can't be auto-created from orders until you add locations.</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">#{t.orderId}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {productBySku[t.sku] ?? <span className="text-slate-400 italic">Unknown</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.sku}</td>
                      <td className="px-4 py-3">{t.quantity}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{t.sourceZoneCode} / {t.sourceShelfCode}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{t.destinationZoneCode} / {t.destinationShelfCode}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{t.assignedWorkerId ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TASK_BADGE[t.status]}`}>{t.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3">
                        {t.status === 'PENDING' && (
                          <button
                            onClick={() => startMut.mutate({ id: t.id })}
                            disabled={busy}
                            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Start
                          </button>
                        )}
                        {t.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => completeMut.mutate({ id: t.id })}
                            disabled={busy}
                            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SKU Locations ── */}
      {tab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Register where each product SKU lives in the warehouse. This enables automatic picking task creation when orders are placed.
            </p>
            <button
              onClick={() => setShowLocForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={14} /> Register location
            </button>
          </div>

          {showLocForm && (
            <form
              onSubmit={handleAddLoc}
              className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-indigo-900">Register SKU location</h3>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Product (SKU)</label>
                  <select
                    required
                    value={locForm.sku}
                    onChange={(e) => setLocForm({ ...locForm, sku: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— select product —</option>
                    {(productsQuery.data ?? []).map((p) => (
                      <option key={p.id} value={p.sku}>{p.sku} — {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Zone code</label>
                  <select
                    required
                    value={locForm.zoneCode}
                    onChange={(e) => setLocForm({ ...locForm, zoneCode: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— select zone —</option>
                    {(zonesQuery.data ?? []).map((z) => (
                      <option key={z.id} value={z.code}>{z.code} — {z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Shelf code</label>
                  <input
                    required
                    placeholder="e.g. A-01"
                    value={locForm.shelfCode}
                    onChange={(e) => setLocForm({ ...locForm, shelfCode: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">On-hand qty</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={locForm.onHandQuantity}
                    onChange={(e) => setLocForm({ ...locForm, onHandQuantity: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addLocMut.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addLocMut.isPending ? 'Saving…' : 'Save location'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLocForm(false); setLocForm(EMPTY_LOC) }}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Shelf</th>
                  <th className="px-4 py-3 text-right">On-hand qty</th>
                </tr>
              </thead>
              <tbody>
                {locsQuery.isLoading ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-400">Loading…</td></tr>
                ) : (locsQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <MapPin size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">No SKU locations registered yet.</p>
                      <p className="mt-1 text-xs text-slate-400">Add locations so picking tasks can be auto-created when orders arrive.</p>
                    </td>
                  </tr>
                ) : (
                  (locsQuery.data ?? []).map((loc) => (
                    <tr key={loc.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{loc.sku}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-700">{loc.zoneCode}</span>
                        {loc.zoneName && <span className="ml-1 text-xs text-slate-400">({loc.zoneName})</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{loc.shelfCode}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${loc.onHandQuantity === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {loc.onHandQuantity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Zones ── */}
      {tab === 'zones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Zones are automatically seeded on startup (RCV-01, STOR-01, PICK-01, PACK-01, SHIP-01). Add custom zones here.
            </p>
            <button
              onClick={() => setShowZoneForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={14} /> Create zone
            </button>
          </div>

          {showZoneForm && (
            <form
              onSubmit={handleAddZone}
              className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-indigo-900">Create warehouse zone</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Code <span className="text-red-500">*</span></label>
                  <input
                    required
                    placeholder="e.g. STOR-02"
                    value={zoneForm.code}
                    onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Name <span className="text-red-500">*</span></label>
                  <input
                    required
                    placeholder="e.g. Secondary Storage"
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Type <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={zoneForm.type}
                    onChange={(e) => setZoneForm({ ...zoneForm, type: e.target.value as ZoneType })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {ALL_ZONE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                  <input
                    placeholder="Optional description"
                    value={zoneForm.description ?? ''}
                    onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addZoneMut.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addZoneMut.isPending ? 'Creating…' : 'Create zone'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowZoneForm(false); setZoneForm(EMPTY_ZONE) }}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zonesQuery.isLoading && <p className="text-slate-400 text-sm col-span-3">Loading…</p>}
            {(zonesQuery.data ?? []).map((z) => (
              <div key={z.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-slate-900">{z.code}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ZONE_TYPE_BADGE[z.type] ?? 'bg-slate-100 text-slate-700'}`}>
                    {z.type}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700">{z.name}</p>
                {z.description && <p className="text-xs text-slate-500">{z.description}</p>}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${z.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <span className={`h-2 w-2 rounded-full ${z.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {z.active ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
            {(zonesQuery.data ?? []).length === 0 && !zonesQuery.isLoading && (
              <div className="col-span-3 rounded-lg border border-dashed border-slate-200 p-10 text-center">
                <Layers size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No warehouse zones yet.</p>
                <p className="text-xs text-slate-400 mt-1">They are seeded automatically on service startup, or create one above.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
