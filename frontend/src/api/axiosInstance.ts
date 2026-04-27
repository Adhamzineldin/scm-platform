import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
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
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  if (userId) {
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

export default api

