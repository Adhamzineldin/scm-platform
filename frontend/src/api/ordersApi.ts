import api from './axiosInstance.ts'

export type OrderStatus =
  | 'VALIDATED'
  | 'PICKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface OrderItemRequest {
  sku: string
  quantity: number
  unitPrice: number
}

export interface OrderItemResponse {
  sku: string
  quantity: number
  unitPrice: number
}

export interface OrderRequest {
  idempotencyKey: string
  shippingAddress: string
  items: OrderItemRequest[]
}

export interface OrderResponse {
  id: number
  referenceNumber: string
  userId: string
  shippingAddress: string
  idempotencyKey: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  items: OrderItemResponse[]
}

export interface OrderStatusHistoryEntry {
  id: number
  orderId: number
  previousStatus: string | null
  newStatus: string
  changedAt: string
  changedBy: string | null
  note: string | null
}

export interface PagedResponse<T> {
  content: T[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}

export async function listOrders(params: { page?: number; size?: number } = {}) {
  const { data } = await api.get<PagedResponse<OrderResponse>>('/api/orders', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  })
  return data
}

export async function listMyOrders(params: { page?: number; size?: number } = {}) {
  const { data } = await api.get<PagedResponse<OrderResponse>>('/api/orders/my-orders', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  })
  return data
}

export async function getOrder(id: number | string) {
  const { data } = await api.get<OrderResponse>(`/api/orders/${id}`)
  return data
}

export async function createOrder(body: OrderRequest) {
  const { data } = await api.post<OrderResponse>('/api/orders', body)
  return data
}


export async function getOrderHistory(orderId: number | string): Promise<OrderStatusHistoryEntry[]> {
  const { data } = await api.get<OrderStatusHistoryEntry[]>(`/api/orders/${orderId}/history`)
  return data
}
