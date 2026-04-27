import axios, { isAxiosError, AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore.ts'

/**
 * Resolution order:
 *   1. window.__APP_CONFIG__.API_BASE_URL  (runtime, injected by docker entrypoint)
 *   2. import.meta.env.VITE_API_BASE_URL    (build-time, used by `npm run dev`)
 *   3. http://localhost:7080                (dev fallback)
 */
declare global {
  interface Window {
    __APP_CONFIG__?: { API_BASE_URL?: string }
  }
}

const runtimeUrl = window.__APP_CONFIG__?.API_BASE_URL
const buildUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

export const API_BASE_URL =
  (runtimeUrl && !runtimeUrl.includes('__API_BASE_URL__') ? runtimeUrl : undefined) ??
  (buildUrl && !buildUrl.includes('__API_BASE_URL__') ? buildUrl : undefined) ??
  'http://localhost:7080'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, userId } = useAuthStore.getState()
  // Public auth endpoints must NEVER receive a stale token, otherwise a
  // previous session can poison /login or /register on the server.
  const isPublicAuth =
    typeof config.url === 'string' && /\/api\/auth\/(login|register)\b/.test(config.url)

  if (token && !isPublicAuth) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  if (userId && !isPublicAuth) {
    config.headers.set('X-User-Id', userId)
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Pull a human-readable message out of any Axios error.
 * Tries the backend's { message } field first, falls back to status-based
 * strings, then to the provided fallback.
 */
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!isAxiosError(error)) return fallback

  if (!error.response) return 'Cannot reach server — check your connection'

  const data = error.response.data as
    | { message?: string; error?: string; [k: string]: unknown }
    | string
    | null
    | undefined

  if (typeof data === 'string' && data.trim()) return data.trim()

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim()
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim()
    // validation map: { field: "message", … }
    const entries = Object.entries(data).filter(
      ([, v]) => typeof v === 'string',
    ) as [string, string][]
    if (entries.length) return entries.map(([f, v]) => `${f}: ${v}`).join(' · ')
  }

  const status = error.response.status
  if (status === 400) return 'Invalid request — check your input'
  if (status === 403) return 'You do not have permission to do this'
  if (status === 404) return 'The requested resource was not found'
  if (status === 409) return 'Conflict — this resource already exists'
  if (status >= 500) return 'Server error — please try again later'
  return fallback
}

export { isAxiosError }
export default api

