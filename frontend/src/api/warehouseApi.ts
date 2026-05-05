import api from './axiosInstance.ts'
import type { PagedResponse } from './ordersApi.ts'

export type ZoneType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'PACKING' | 'SHIPPING' | 'STAGING'
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface WarehouseZoneResponse {
  id: number
  code: string
  name: string
  type: ZoneType
  description: string
  active: boolean
}

export interface SkuLocationResponse {
  id: number
  sku: string
  zoneCode: string
  zoneName: string
  shelfCode: string
  onHandQuantity: number
}

export interface SkuLocationRequest {
  sku: string
  zoneCode: string
  shelfCode: string
  onHandQuantity: number
}

export interface PickingTaskResponse {
  id: number
  orderId: number
  sku: string
  quantity: number
  sourceZoneCode: string
  sourceShelfCode: string
  destinationZoneCode: string
  destinationShelfCode: string
  assignedWorkerId: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export interface WarehouseZoneRequest {
  code: string
  name: string
  type: ZoneType
  description?: string
}

export async function listZones(params: { page?: number; size?: number } = {}): Promise<PagedResponse<WarehouseZoneResponse>> {
  const { data } = await api.get<PagedResponse<WarehouseZoneResponse>>('/api/warehouse/zones', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  })
  return data
}

export async function createZone(body: WarehouseZoneRequest): Promise<WarehouseZoneResponse> {
  const { data } = await api.post<WarehouseZoneResponse>('/api/warehouse/zones', body)
  return data
}

export async function listSkuLocations(params: { page?: number; size?: number } = {}): Promise<PagedResponse<SkuLocationResponse>> {
  const { data } = await api.get<PagedResponse<SkuLocationResponse>>('/api/warehouse/locations', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  })
  return data
}

export async function createSkuLocation(body: SkuLocationRequest): Promise<SkuLocationResponse> {
  const { data } = await api.post<SkuLocationResponse>('/api/warehouse/locations', body)
  return data
}

export async function listPickingTasks(params: {
  status?: TaskStatus
  page?: number
  size?: number
} = {}): Promise<PagedResponse<PickingTaskResponse>> {
  const { data } = await api.get<PagedResponse<PickingTaskResponse>>('/api/warehouse/tasks', {
    params: {
      ...(params.status ? { status: params.status } : {}),
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  })
  return data
}

export async function listTasksForOrder(orderId: number): Promise<PickingTaskResponse[]> {
  const { data } = await api.get<PickingTaskResponse[]>(`/api/warehouse/orders/${orderId}/tasks`)
  return data
}

export async function startPickingTask(taskId: number, workerId: string): Promise<PickingTaskResponse> {
  const { data } = await api.patch<PickingTaskResponse>(
    `/api/warehouse/tasks/${taskId}/start`,
    { workerId },
  )
  return data
}

export async function completePickingTask(taskId: number, workerId: string): Promise<PickingTaskResponse> {
  const { data } = await api.patch<PickingTaskResponse>(
    `/api/warehouse/tasks/${taskId}/complete`,
    { workerId },
  )
  return data
}

export async function cancelPickingTask(taskId: number): Promise<PickingTaskResponse> {
  const { data } = await api.patch<PickingTaskResponse>(`/api/warehouse/tasks/${taskId}/cancel`)
  return data
}
