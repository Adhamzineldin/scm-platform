import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '../api/authApi.ts'
import { useAuthStore } from '../store/authStore.ts'

interface RoleRouteProps {
  allow: Role[]
}

/**
 * Wraps a route subtree and only renders it if the current user's role is in
 * `allow`. Mirrors the rules in auth-service `SecurityConfig`. ADMIN is
 * implicitly allowed everywhere.
 */
export default function RoleRoute({ allow }: RoleRouteProps) {
  const role = useAuthStore((s) => s.role)
  const allowed = role && (role === 'ADMIN' || allow.includes(role))
  if (!allowed) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

