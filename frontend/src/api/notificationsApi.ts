/**
 * Notifications are delivered exclusively over Server-Sent Events
 * (NotificationStreamController in notification-service). There is no REST
 * "history" endpoint yet, so the in-app inbox is session-scoped and lives in
 * `notificationStore`.
 */

export interface InAppNotification {
  /** Stable client-side id for list keys (server payload has no id). */
  clientId: string
  type: string
  orderId?: number
  userId?: string
  title: string
  message: string
  timestamp: string
  read: boolean
}

