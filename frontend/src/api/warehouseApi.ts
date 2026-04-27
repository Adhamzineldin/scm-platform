import api from './axiosInstance.ts'

export type ZoneType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'PACKING' | 'SHIPPING'
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface WarehouseZoneResponse {
  id: number
  code: string
  name: string
  type: ZoneType
  description: string
  active: boolean
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

export async function listZones() {
  const { data } = await api.get<WarehouseZoneResponse[]>('/api/warehouses/zones')
  return data
}

export async function listPickingTasks() {
  const { data } = await api.get<PickingTaskResponse[]>('/api/warehouses/picking-tasks')
  return data
}

export async function updatePickingTaskStatus(id: number, status: TaskStatus) {
  const { data } = await api.patch<PickingTaskResponse>(
    `/api/warehouses/picking-tasks/${id}/status`,
    { status },
  )
  return data
}

