import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import PrivateRoute from './components/PrivateRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import OrdersListPage from './pages/orders/OrdersListPage'
import OrderDetailPage from './pages/orders/OrderDetailPage'
import CreateOrderPage from './pages/orders/CreateOrderPage'
import InventoryPage from './pages/inventory/InventoryPage'
import CreateProductPage from './pages/inventory/CreateProductPage'
import ProductDetailPage from './pages/inventory/ProductDetailPage'
import WarehousePage from './pages/warehouse/WarehousePage'
import ShipmentsListPage from './pages/shipments/ShipmentsListPage'
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage'
import CartPage from './pages/cart/CartPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardHome />} />

          <Route path="/orders" element={<OrdersListPage />} />
          <Route path="/orders/new" element={<CreateOrderPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />

          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/new" element={<CreateProductPage />} />
          <Route path="/inventory/:id" element={<ProductDetailPage />} />

          <Route path="/warehouse" element={<WarehousePage />} />

          <Route path="/shipments" element={<ShipmentsListPage />} />
          <Route path="/shipments/:id" element={<ShipmentDetailPage />} />

          <Route path="/cart" element={<CartPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
