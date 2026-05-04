import api from './axiosInstance.ts'
import type { PagedResponse } from './ordersApi.ts'

export interface ShipmentResponse {
  id: number
  orderId: number
  userId: string
  trackingNumber: string
  carrier: string
  shippingAddress: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface DispatchRecordDto {
  id: number
  dispatchedAt: string
  carrierName: string
  carrierReference: string
  pickupLocation: string
  deliveryAddress: string
  notes: string
}

export interface ShipmentHistoryDto {
  id: number
  previousStatus: string
  newStatus: string
  changedAt: string
  changedBy: string
  location: string
  description: string
}

export interface ShipmentDetailResponse {
  id: number
  orderId: number
  trackingNumber: string
  status: string
  carrier: string
  createdAt: string
  updatedAt: string
  currentDispatch: DispatchRecordDto | null
  history: ShipmentHistoryDto[]
}

export interface DispatchRequest {
  carrierName: string
  carrierReference: string
  pickupLocation: string
  deliveryAddress: string
  notes?: string
}

export interface ShipmentTrackingResponse {
  trackingNumber: string
  status: string
  carrier: string
  history: ShipmentHistoryDto[]
}

export async function listShipments(params: { page?: number; size?: number } = {}): Promise<PagedResponse<ShipmentResponse>> {
  const { data } = await api.get<PagedResponse<ShipmentResponse>>('/api/shipments', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  })
  return data
}

export async function getShipment(id: number | string): Promise<ShipmentDetailResponse> {
  const { data } = await api.get<ShipmentDetailResponse>(`/api/shipments/${id}`)
  return data
}

export async function getShipmentDispatches(id: number | string): Promise<DispatchRecordDto[]> {
  const { data } = await api.get<DispatchRecordDto[]>(`/api/shipments/${id}/dispatches`)
  return data
}

export async function getShipmentStatusHistory(id: number | string): Promise<ShipmentHistoryDto[]> {
  const { data } = await api.get<ShipmentHistoryDto[]>(`/api/shipments/${id}/history`)
  return data
}

export async function dispatchShipment(id: number | string, body: DispatchRequest): Promise<DispatchRecordDto> {
  const { data } = await api.post<DispatchRecordDto>(`/api/shipments/${id}/dispatch`, body)
  return data
}

export async function getShipmentTracking(id: number | string): Promise<ShipmentTrackingResponse> {
  const { data } = await api.get<ShipmentTrackingResponse>(`/api/shipments/${id}/tracking`)
  return data
}

export async function getShipmentByOrder(orderId: number | string): Promise<ShipmentDetailResponse | null> {
  try {
    const { data } = await api.get<ShipmentDetailResponse>(`/api/shipments/by-order/${orderId}`)
    return data
  } catch {
    return null
  }
}

export interface CreateShipmentRequest {
  orderId: number
  userId: string
  shippingAddress: string
}

export async function createShipment(body: CreateShipmentRequest): Promise<ShipmentDetailResponse> {
  const { data } = await api.post<ShipmentDetailResponse>('/api/shipments', body)
  return data
}

export async function advanceShipmentStatus(id: number, status: string, note?: string): Promise<ShipmentResponse> {
  const { data } = await api.patch<ShipmentResponse>(`/api/shipments/${id}/status`, { status, note })
  return data
}
