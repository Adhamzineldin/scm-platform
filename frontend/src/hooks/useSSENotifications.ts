import { useEffect } from 'react'
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

  useEffect(() => {
    if (!token || !userId) return
    // Backend NotificationStreamController requires ?userId=… ; the gateway's
    // JwtAuthFilter accepts ?token=… as a fallback for EventSource (which can't
    // set Authorization headers).
    const url = `${API_BASE_URL}/api/notifications/stream?userId=${encodeURIComponent(
      userId,
    )}&token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SsePayload
        const title = data.title ?? data.type ?? 'Notification'
        const message = data.message ?? ''
        toast.success(`${title}: ${message}`)
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
    }

    return () => es.close()
  }, [token, userId, addNotification])
}
