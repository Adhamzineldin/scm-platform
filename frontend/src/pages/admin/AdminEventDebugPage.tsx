import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, Rss, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { listNotificationEventState } from '../../api/adminApi.ts'

function fmt(ts?: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

function TypeBadge({ type }: { type: string }) {
  const color = type.includes('ORDER') ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    : type.includes('SHIP') ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${color}`}>
      {type}
    </span>
  )
}

export default function AdminEventDebugPage() {
  const PAGE_SIZE = 20
  const [kafkaPage, setKafkaPage] = useState(0)
  const [ssePage, setSsePage] = useState(0)
  const query = useQuery({
    queryKey: ['admin-event-state', kafkaPage, ssePage, PAGE_SIZE],
    queryFn: () =>
      listNotificationEventState({
        kafkaPage,
        kafkaSize: PAGE_SIZE,
        ssePage,
        sseSize: PAGE_SIZE,
      }),
    refetchInterval: 5000,
  })

  const kafkaRows = Array.isArray(query.data?.kafkaEvents) ? query.data.kafkaEvents : []
  const sseRows = Array.isArray(query.data?.sseEvents) ? query.data.sseEvents : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event State</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Kafka events and SSE delivery state · auto-refreshes every 5 s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {query.isFetching && (
            <RefreshCw size={14} className="animate-spin text-indigo-500" />
          )}
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Users
          </Link>
        </div>
      </div>

      {/* Kafka events table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <Activity size={16} className="text-indigo-500 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Kafka Events</h2>
            <p className="text-xs text-slate-500">What the notification service actually consumed from Kafka</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Topic</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Consumer Group</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Order</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Event Time</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Loading…</td></tr>
              ) : kafkaRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <Activity size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">No Kafka events observed yet</p>
                  </td>
                </tr>
              ) : (
                kafkaRows.map((row) => (
                  <tr key={`${row.topic}-${row.consumedAt}-${row.type}-${row.orderId ?? 'na'}`} className="align-top hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><TypeBadge type={row.type} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.topic}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.consumerGroup}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.userId ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.orderId ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{row.summary}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(row.eventTimestamp)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(row.consumedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(kafkaPage > 0 || kafkaRows.length > 0) && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Kafka page <span className="font-semibold text-slate-700">{kafkaPage + 1}</span></span>
            <div className="flex gap-2">
              <button onClick={() => setKafkaPage((p) => Math.max(0, p - 1))} disabled={kafkaPage === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setKafkaPage((p) => p + 1)} disabled={kafkaRows.length < PAGE_SIZE}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SSE delivery state */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <Rss size={16} className="text-emerald-500 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-slate-800">SSE Delivery State</h2>
            <p className="text-xs text-slate-500">Latest pushed real-time event per user and subscriber count</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Order</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Message</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Active SSE Subs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading…</td></tr>
              ) : sseRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Rss size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">No SSE events yet</p>
                  </td>
                </tr>
              ) : (
                sseRows.map((row) => (
                  <tr key={`${row.userId}-${row.timestamp}-${row.type}`} className="align-top hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.userId}</td>
                    <td className="px-4 py-3"><TypeBadge type={row.type} /></td>
                    <td className="px-4 py-3 text-slate-600">{row.orderId ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{row.title ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{row.message ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(row.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        {row.activeSubscribers}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(ssePage > 0 || sseRows.length > 0) && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">SSE page <span className="font-semibold text-slate-700">{ssePage + 1}</span></span>
            <div className="flex gap-2">
              <button onClick={() => setSsePage((p) => Math.max(0, p - 1))} disabled={ssePage === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setSsePage((p) => p + 1)} disabled={sseRows.length < PAGE_SIZE}
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
