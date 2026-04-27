import api from './axiosInstance.ts'
import type { OrderResponse } from './ordersApi.ts'

/** Backend `ApiResponse<T>` envelope used by cart-service. */
interface ApiResponse<T> {
  status: number
  message: string
  data?: T
}

export interface CartItemResponse {
  productId: number
  quantity: number
}

export interface CartResponse {
  userId: number
  items: CartItemResponse[]
  totalItems: number
}

export interface AddItemToCartRequest {
  userId: number
  productId: number
  quantity: number
}

export interface UpdateCartItemRequest {
  userId: number
  productId: number
  quantity: number
}

export interface CheckoutRequest {
  shippingAddress: string
  idempotencyKey?: string
}

export async function getCart(userId: number): Promise<CartResponse> {
  const { data } = await api.get<ApiResponse<CartResponse>>(`/api/carts/${userId}`)
  return (
    data.data ?? { userId, items: [], totalItems: 0 }
  )
}

export async function addCartItem(body: AddItemToCartRequest): Promise<void> {
  await api.post<ApiResponse<void>>('/api/carts/items', body)
}

export async function updateCartItem(body: UpdateCartItemRequest): Promise<void> {
  await api.put<ApiResponse<void>>('/api/carts/items', body)
}

export async function removeCartItem(userId: number, productId: number): Promise<void> {
  await api.delete<ApiResponse<void>>(`/api/carts/${userId}/items/${productId}`)
}

export async function clearCart(userId: number): Promise<void> {
  await api.delete<ApiResponse<void>>(`/api/carts/${userId}`)
}

export async function checkout(userId: number, body: CheckoutRequest): Promise<OrderResponse> {
  const { data } = await api.post<ApiResponse<OrderResponse>>(`/api/carts/${userId}/checkout`, body)
  if (!data.data) throw new Error(data.message || 'Checkout failed')
  return data.data
}
