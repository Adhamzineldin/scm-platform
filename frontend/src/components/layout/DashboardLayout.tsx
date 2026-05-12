import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.tsx'
import Header from './Header.tsx'
import { useSSENotifications } from '../../hooks/useSSENotifications.ts'

export default function DashboardLayout() {
  useSSENotifications()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
