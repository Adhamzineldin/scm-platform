import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { extractUserId, type Role } from '../api/authApi'

interface AuthState {
  token: string | null
  username: string | null
  role: Role | null
  userId: string | null
  userIdNum: number | null
  setAuth: (auth: { token: string; username: string; role: Role }) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      role: null,
      userId: null,
      userIdNum: null,
      setAuth: ({ token, username, role }) => {
        const userId = extractUserId(token)
        const parsed = userId ? Number(userId) : NaN
        set({
          token,
          username,
          role,
          userId,
          userIdNum: Number.isFinite(parsed) ? parsed : null,
        })
      },
      logout: () =>
        set({ token: null, username: null, role: null, userId: null, userIdNum: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'scm-auth' },
  ),
)

