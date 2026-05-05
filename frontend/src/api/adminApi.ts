import api from './axiosInstance.ts'
import type { Role } from './authApi.ts'
import type { PagedResponse } from './ordersApi.ts'

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

export async function listUsers(params: { page?: number; size?: number } = {}): Promise<PagedResponse<AdminUser>> {
  const { data } = await api.get<PagedResponse<AdminUser>>('/api/admin/users', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  })
  return data
}

export async function updateUserRole(id: number, role: Role): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/api/admin/users/${id}/role`, { role })
  return data
}

export async function listNotificationEventState(params: {
  kafkaPage?: number
  kafkaSize?: number
  ssePage?: number
  sseSize?: number
} = {}): Promise<AdminEventSnapshot> {
  const { data } = await api.get<AdminEventSnapshot>('/api/notifications/admin/event-state', {
    params: {
      kafkaPage: params.kafkaPage ?? 0,
      kafkaSize: params.kafkaSize ?? 20,
      ssePage: params.ssePage ?? 0,
      sseSize: params.sseSize ?? 20,
    },
  })
  return data
}

