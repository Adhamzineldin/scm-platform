import api from './axiosInstance'

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

export async function listShipments() {
  const { data } = await api.get<ShipmentResponse[]>('/api/shipments')
  return data
}

export async function getShipment(id: number | string) {
  const { data } = await api.get<ShipmentDetailResponse>(`/api/shipments/${id}`)
  return data
}

export async function getShipmentDispatches(id: number | string) {
  const { data } = await api.get<DispatchRecordDto[]>(`/api/shipments/${id}/dispatches`)
  return data
}

export async function getShipmentStatusHistory(id: number | string) {
  const { data } = await api.get<ShipmentHistoryDto[]>(`/api/shipments/${id}/status-history`)
  return data
}

