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

export async function listZones(): Promise<WarehouseZoneResponse[]> {
  const { data } = await api.get<WarehouseZoneResponse[]>('/api/warehouse/zones')
  return data
}

export async function listPickingTasks(status?: TaskStatus): Promise<PickingTaskResponse[]> {
  const { data } = await api.get<PickingTaskResponse[]>('/api/warehouse/tasks', {
    params: status ? { status } : undefined,
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
