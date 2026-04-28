import api from './axiosInstance.ts'

export type Role =
  | 'CUSTOMER'
  | 'STAFF'
  | 'ADMIN'
  | 'INVENTORY_MANAGER'
  | 'ORDER_PROCESSING'
  | 'WAREHOUSE_SPECIALIST'
  | 'SHIPMENT_LEAD'
  | 'CLOUD_ARCHITECT'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  // role intentionally omitted — server always assigns STAFF on self-registration.
  // Privileged roles are granted by an admin via PATCH /api/admin/users/{id}/role.
}

export interface AuthResponse {
  token: string
  username: string
  role: Role
}

export interface DashboardSummary {
  username: string
  email: string
  role: Role
  menuItems: string[]
}

export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function extractUserId(token: string): string | null {
  const payload = decodeJwt(token)
  if (!payload) return null
  const id = payload.userId ?? payload.sub
  return id != null ? String(id) : null
}

export interface OtpSentResponse {
  message: string
  email: string
}

export async function login(body: LoginRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', body)
  return data
}

export async function register(body: RegisterRequest): Promise<OtpSentResponse> {
  const { data } = await api.post<OtpSentResponse>('/api/auth/register', body)
  return data
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/verify-otp', { email, otp })
  return data
}

export async function resendOtp(email: string): Promise<OtpSentResponse> {
  const { data } = await api.post<OtpSentResponse>(`/api/auth/resend-otp?email=${encodeURIComponent(email)}`)
  return data
}

export async function getMyDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/api/dashboard/me')
  return data
}
