import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listNotificationEventState } from '../../api/adminApi.ts'

function fmt(ts?: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

export default function AdminEventDebugPage() {
  const query = useQuery({
    queryKey: ['admin-event-state'],
    queryFn: listNotificationEventState,
    refetchInterval: 5000,
  })

  const kafkaRows = query.data?.kafkaEvents ?? []
  const sseRows = query.data?.sseEvents ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Event State</h1>
        <Link
          to="/admin/users"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Back to Users
        </Link>
      </div>

      <p className="text-sm text-slate-500">
        Recent Kafka events consumed by `notification-service`, plus the latest SSE delivery state per user (auto-refreshes every 5s).
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Kafka events</h2>
          <p className="mt-1 text-xs text-slate-500">This is the important pipeline view: what the service actually consumed from Kafka.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Consumer Group</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Event Time</th>
              <th className="px-4 py-3">Consumed</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr><td colSpan={8} className="p-6 text-center text-slate-500">Loading…</td></tr>
            ) : kafkaRows.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-slate-500">No Kafka events observed yet</td></tr>
            ) : (
              kafkaRows.map((row) => (
                <tr key={`${row.topic}-${row.consumedAt}-${row.type}-${row.orderId ?? 'na'}`} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.topic}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.consumerGroup}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.userId ?? '—'}</td>
                  <td className="px-4 py-3">{row.orderId ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.summary}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(row.eventTimestamp)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(row.consumedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">SSE delivery state</h2>
          <p className="mt-1 text-xs text-slate-500">Latest pushed realtime event per user and current subscriber count.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Active SSE Subs</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading…</td></tr>
            ) : sseRows.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">No SSE events yet</td></tr>
            ) : (
              sseRows.map((row) => (
                <tr key={`${row.userId}-${row.timestamp}-${row.type}`} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{row.userId}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{row.orderId ?? '—'}</td>
                  <td className="px-4 py-3">{row.title ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.message ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(row.timestamp)}</td>
                  <td className="px-4 py-3">{row.activeSubscribers}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

