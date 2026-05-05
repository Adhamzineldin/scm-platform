import api from './axiosInstance.ts'
import type { Role } from './authApi.ts'

export interface AdminUser {
  id: number
  username: string
  email: string
  role: Role
}

export interface AdminEventState {
  userId: string
  type: string
  orderId?: number
  title?: string
  message?: string
  timestamp?: string
  activeSubscribers: number
}

export interface AdminKafkaEventState {
  type: string
  topic: string
  consumerGroup: string
  orderId?: number
  userId?: string
  summary: string
  eventTimestamp?: string
  consumedAt?: string
}

export interface AdminEventSnapshot {
  kafkaEvents: AdminKafkaEventState[]
  sseEvents: AdminEventState[]
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/api/admin/users')
  return data
}

export async function updateUserRole(id: number, role: Role): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/api/admin/users/${id}/role`, { role })
  return data
}

export async function listNotificationEventState(): Promise<AdminEventSnapshot> {
  const { data } = await api.get<AdminEventSnapshot>('/api/notifications/admin/event-state')
  return data
}

