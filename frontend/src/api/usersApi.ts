import api from './axiosInstance.ts'

export interface UserSummary {
  id: number
  username: string
  email: string
  role: string
}

export async function getUser(id: string | number): Promise<UserSummary> {
  const { data } = await api.get<UserSummary>(`/api/users/${id}`)
  return data
}

