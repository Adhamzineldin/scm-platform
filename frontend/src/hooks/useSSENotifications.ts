import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore.ts'
import { useNotificationStore } from '../store/notificationStore.ts'
import { API_BASE_URL } from '../api/axiosInstance.ts'

let activeEventSource: EventSource | null = null
let activeSessionKey: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectInFlight = false

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
  const queryClient = useQueryClient()
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const sessionKey = token && userId ? `${userId}:${token}` : null

  useEffect(() => {
    if (!token || !userId || !sessionKey) return

    let destroyed = false

    const clearRetry = () => {
      if (retryRef.current) {
        clearTimeout(retryRef.current)
        retryRef.current = null
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const closeSource = () => {
      esRef.current?.close()
      if (activeEventSource === esRef.current) {
        activeEventSource = null
      }
      esRef.current = null
    }

    const scheduleReconnect = () => {
      if (destroyed) return
      clearRetry()
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, 5000)
      retryRef.current = reconnectTimer
    }

    const connect = () => {
      if (destroyed || connectInFlight) return

      const current = esRef.current ?? activeEventSource
      if (
        activeSessionKey === sessionKey &&
        current &&
        (current.readyState === EventSource.OPEN || current.readyState === EventSource.CONNECTING)
      ) {
        esRef.current = current
        return
      }

      connectInFlight = true
      clearRetry()
      closeSource()
      if (activeEventSource && activeEventSource !== esRef.current) {
        activeEventSource.close()
      }

      const url = `${API_BASE_URL}/api/notifications/stream?userId=${encodeURIComponent(
        userId,
      )}&token=${encodeURIComponent(token)}`

      const es = new EventSource(url)
      esRef.current = es
      activeEventSource = es
      activeSessionKey = sessionKey

      const processPayload = (raw: string) => {
        try {
          const data = JSON.parse(raw) as SsePayload
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

          if (data.orderId != null) {
            const orderKey = String(data.orderId)
            void queryClient.invalidateQueries({ queryKey: ['order', orderKey] })
            void queryClient.invalidateQueries({ queryKey: ['order-history', orderKey] })
            void queryClient.invalidateQueries({ queryKey: ['shipment-by-order', orderKey] })
            void queryClient.invalidateQueries({ queryKey: ['picking-tasks-for-order', orderKey] })
          }

          void queryClient.invalidateQueries({ queryKey: ['orders'] })
          void queryClient.invalidateQueries({ queryKey: ['my-orders'] })
          void queryClient.invalidateQueries({ queryKey: ['shipments'] })
        } catch {
          // ignore malformed
        }
      }

      es.onmessage = (event) => processPayload(event.data)

      es.onopen = () => {
        connectInFlight = false
        clearRetry()
      }

      const eventNames = ['ORDER_CONFIRMED', 'ORDER_STATUS_UPDATED', 'SHIPMENT_DISPATCHED', 'SHIPMENT_DELIVERED']
      eventNames.forEach((eventName) => {
        es.addEventListener(eventName, (event) => processPayload((event as MessageEvent).data))
      })

      es.onerror = () => {
        connectInFlight = false
        if (esRef.current === es) {
          closeSource()
        }
        if (activeEventSource === es) {
          activeEventSource = null
        }
        if (activeSessionKey === sessionKey) {
          activeSessionKey = null
        }
        if (!destroyed) {
          scheduleReconnect()
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      connectInFlight = false
      clearRetry()
      closeSource()
      if (activeSessionKey === sessionKey) {
        activeSessionKey = null
      }
    }
  }, [token, userId, sessionKey, addNotification, queryClient])
}
