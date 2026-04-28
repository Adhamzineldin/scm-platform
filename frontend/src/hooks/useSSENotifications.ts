import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore.ts'
import { useNotificationStore } from '../store/notificationStore.ts'
import { API_BASE_URL } from '../api/axiosInstance.ts'

interface SsePayload {
  type?: string
  orderId?: number
  userId?: string
  title?: string
  message?: string
  timestamp?: string
}

export function useSSENotifications() {
  const token = useAuthStore((s) => s.token)
  const userId = useAuthStore((s) => s.userId)
  const addNotification = useNotificationStore((s) => s.add)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!token || !userId) return

    let destroyed = false

    const connect = () => {
      if (destroyed) return

      const url = `${API_BASE_URL}/api/notifications/stream?userId=${encodeURIComponent(
        userId,
      )}&token=${encodeURIComponent(token)}`

      const es = new EventSource(url)
      esRef.current = es

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SsePayload
          const title = data.title ?? data.type ?? 'Notification'
          const message = data.message ?? ''
          toast.success(`${title}${message ? ': ' + message : ''}`, { duration: 5000 })
          addNotification({
            type: data.type ?? 'INFO',
            orderId: data.orderId,
            userId: data.userId,
            title,
            message,
            timestamp: data.timestamp ?? new Date().toISOString(),
          })
        } catch {
          // ignore malformed
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        if (!destroyed) {
          // Reconnect after 5 seconds
          retryRef.current = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (retryRef.current) clearTimeout(retryRef.current)
      esRef.current?.close()
      esRef.current = null
    }
  }, [token, userId, addNotification])
}
