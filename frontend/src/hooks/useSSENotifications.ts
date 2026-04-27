import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore.ts'
import { API_BASE_URL } from '../api/axiosInstance.ts'

export interface InAppNotification {
  type: string
  orderId: number
  userId: string
  title: string
  message: string
  timestamp: string
}

export function useSSENotifications() {
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return
    const url = `${API_BASE_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as InAppNotification
        toast.success(`${data.title}: ${data.message}`)
      } catch {
        // ignore malformed
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [token])
}

