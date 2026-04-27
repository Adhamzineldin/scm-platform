import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage.tsx'
import RegisterPage from './pages/auth/RegisterPage.tsx'
import PrivateRoute from './components/PrivateRoute.tsx'
import RoleRoute from './components/RoleRoute.tsx'
import DashboardLayout from './components/layout/DashboardLayout.tsx'
import DashboardHome from './pages/dashboard/DashboardHome.tsx'
import OrdersListPage from './pages/orders/OrdersListPage.tsx'
import OrderDetailPage from './pages/orders/OrderDetailPage.tsx'
import CreateOrderPage from './pages/orders/CreateOrderPage.tsx'
import InventoryPage from './pages/inventory/InventoryPage.tsx'
import CreateProductPage from './pages/inventory/CreateProductPage.tsx'
import ProductDetailPage from './pages/inventory/ProductDetailPage.tsx'
import WarehousePage from './pages/warehouse/WarehousePage.tsx'
import ShipmentsListPage from './pages/shipments/ShipmentsListPage.tsx'
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage.tsx'
import CartPage from './pages/cart/CartPage.tsx'
import AdminUsersPage from './pages/admin/AdminUsersPage.tsx'
import NotificationsPage from './pages/notifications/NotificationsPage.tsx'
import DocumentsPage from './pages/documents/DocumentsPage.tsx'
import ProfilePage from './pages/profile/ProfilePage.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardHome />} />

          {/* Always-on for authenticated users */}
          <Route path="/cart" element={<CartPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Role-restricted (mirrors auth-service SecurityConfig). ADMIN bypasses inside RoleRoute. */}
          <Route element={<RoleRoute allow={['ORDER_PROCESSING']} />}>
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/orders/new" element={<CreateOrderPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>

          <Route element={<RoleRoute allow={['INVENTORY_MANAGER']} />}>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/new" element={<CreateProductPage />} />
            <Route path="/inventory/:id" element={<ProductDetailPage />} />
          </Route>

          <Route element={<RoleRoute allow={['WAREHOUSE_SPECIALIST']} />}>
            <Route path="/warehouse" element={<WarehousePage />} />
          </Route>

          <Route element={<RoleRoute allow={['SHIPMENT_LEAD']} />}>
            <Route path="/shipments" element={<ShipmentsListPage />} />
            <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
          </Route>

          <Route element={<RoleRoute allow={[]} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
