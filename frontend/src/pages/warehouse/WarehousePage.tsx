import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  completePickingTask,
  listPickingTasks,
  listZones,
  startPickingTask,
  type TaskStatus,
} from '../../api/warehouseApi.ts'
import { useAuthStore } from '../../store/authStore.ts'
import { extractErrorMessage } from '../../api/axiosInstance.ts'

const STATUS_BADGE: Record<TaskStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

const STATUS_OPTIONS: (TaskStatus | 'ALL')[] = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export default function WarehousePage() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.userId)
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL')

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: listZones })
  const tasksQuery = useQuery({
    queryKey: ['pickingTasks', filter],
    queryFn: () => listPickingTasks(filter === 'ALL' ? undefined : filter),
  })

  const startMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => startPickingTask(id, userId ?? 'unknown'),
    onSuccess: () => {
      toast.success('Task started')
      qc.invalidateQueries({ queryKey: ['pickingTasks'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to start task')),
  })

  const completeMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => completePickingTask(id, userId ?? 'unknown'),
    onSuccess: () => {
      toast.success('Task completed')
      qc.invalidateQueries({ queryKey: ['pickingTasks'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to complete task')),
  })

  const busy = startMutation.isPending || completeMutation.isPending

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Warehouse</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Zones</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {zonesQuery.data?.map((z) => (
            <div key={z.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{z.code}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{z.type}</span>
              </div>
              <div className="text-sm text-slate-600">{z.name}</div>
              <p className="mt-2 text-xs text-slate-500">{z.description}</p>
              <div className={`mt-2 text-xs ${z.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                {z.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Picking tasks</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TaskStatus | 'ALL')}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Order</th>
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
              {tasksQuery.data?.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{t.id}</td>
                  <td className="px-4 py-3">{t.orderId}</td>
                  <td className="px-4 py-3">{t.sku}</td>
                  <td className="px-4 py-3">{t.quantity}</td>
                  <td className="px-4 py-3">{t.sourceZoneCode}/{t.sourceShelfCode}</td>
                  <td className="px-4 py-3">{t.destinationZoneCode}/{t.destinationShelfCode}</td>
                  <td className="px-4 py-3">{t.assignedWorkerId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'PENDING' && (
                      <button
                        onClick={() => startMutation.mutate({ id: t.id })}
                        disabled={busy}
                        className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                      >
                        Start
                      </button>
                    )}
                    {t.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => completeMutation.mutate({ id: t.id })}
                        disabled={busy}
                        className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(tasksQuery.data ?? []).length === 0 && !tasksQuery.isLoading && (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500">No tasks</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
