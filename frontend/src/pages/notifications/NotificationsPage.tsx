import { Bell, Trash2, CheckCheck, AlertCircle, Package, Truck } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore.ts'
import { EmptyState } from '../../components/ui/EmptyState.tsx'

function notifIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('order')) return <Package size={14} />
  if (t.includes('ship') || t.includes('dispatch')) return <Truck size={14} />
  if (t.includes('alert') || t.includes('warn')) return <AlertCircle size={14} />
  return <Bell size={14} />
}

function notifTone(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('order')) return 'bg-indigo-100 text-indigo-600'
  if (t.includes('ship') || t.includes('dispatch')) return 'bg-amber-100 text-amber-600'
  if (t.includes('alert') || t.includes('warn')) return 'bg-red-100 text-red-600'
  return 'bg-slate-100 text-slate-500'
}

export default function NotificationsPage() {
  const { items, unreadCount, markAllRead, clear } = useNotificationStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Real-time feed via Server-Sent Events · resets on page reload
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
          <button
            onClick={clear}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      {/* Unread count chip */}
      {unreadCount > 0 && (
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
          <Bell size={13} />
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Notifications appear here when orders are placed, statuses change, or shipments are dispatched."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li
                key={n.clientId}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${n.read ? 'bg-white' : 'bg-indigo-50/50'}`}
              >
                {/* Icon */}
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notifTone(n.title)}`}>
                  {notifIcon(n.title)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>
                      {n.title}
                    </p>
                    <time className="shrink-0 text-xs text-slate-400">
                      {new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  {n.orderId && (
                    <a href={`/orders/${n.orderId}`} className="mt-1 inline-block text-xs font-medium text-indigo-600 hover:underline">
                      View Order #{n.orderId}
                    </a>
                  )}
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
