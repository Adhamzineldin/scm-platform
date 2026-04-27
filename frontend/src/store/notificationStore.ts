import { create } from 'zustand'
import type { InAppNotification } from '../api/notificationsApi.ts'

interface NotificationState {
  items: InAppNotification[]
  unreadCount: number
  add: (n: Omit<InAppNotification, 'clientId' | 'read'>) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  add: (n) =>
    set((state) => {
      const item: InAppNotification = {
        ...n,
        clientId: crypto.randomUUID(),
        read: false,
      }
      return {
        items: [item, ...state.items].slice(0, 200), // cap memory
        unreadCount: state.unreadCount + 1,
      }
    }),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((i) => ({ ...i, read: true })),
      unreadCount: 0,
    })),
  clear: () => set({ items: [], unreadCount: 0 }),
}))

