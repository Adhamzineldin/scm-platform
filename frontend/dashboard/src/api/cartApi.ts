import api from './axiosInstance'
import type { OrderResponse } from './ordersApi'

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

export async function getCart(userId: number) {
  const { data } = await api.get<CartResponse>(`/api/carts/${userId}`)
  return data
}

export async function addCartItem(body: AddItemToCartRequest) {
  const { data } = await api.post<CartResponse>('/api/carts/items', body)
  return data
}

export async function updateCartItem(body: UpdateCartItemRequest) {
  const { data } = await api.put<CartResponse>('/api/carts/items', body)
  return data
}

export async function removeCartItem(userId: number, productId: number) {
  await api.delete(`/api/carts/${userId}/items/${productId}`)
}

export async function clearCart(userId: number) {
  await api.delete(`/api/carts/${userId}`)
}

export async function checkout(userId: number, body: CheckoutRequest) {
  const { data } = await api.post<OrderResponse>(`/api/carts/${userId}/checkout`, body)
  return data
}

