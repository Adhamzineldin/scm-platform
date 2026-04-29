import { useNotificationStore } from '../../store/notificationStore.ts'
import { Bell, Trash2, CheckCheck } from 'lucide-react'

export default function NotificationsPage() {
  const { items, unreadCount, markAllRead, clear } = useNotificationStore()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500">
            Live feed via Server-Sent Events. History is session-scoped — events disappear on reload.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
          <button
            onClick={clear}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-slate-500">
            <Bell size={32} className="text-slate-300" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              Notifications appear here when orders are placed, statuses change, or shipments are dispatched.
              They are delivered in real time and reset when you reload the page.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li
                key={n.clientId}
                className={`flex items-start gap-3 p-4 ${n.read ? 'bg-white' : 'bg-indigo-50/40'}`}
              >
                <div className="mt-0.5 rounded-full bg-indigo-100 p-2 text-indigo-600">
                  <Bell size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                    <time className="shrink-0 text-xs text-slate-400">
                      {new Date(n.timestamp).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  {n.orderId && (
                    <p className="mt-1 text-xs text-slate-400">Order #{n.orderId}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

