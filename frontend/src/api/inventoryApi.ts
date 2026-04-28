import api from './axiosInstance.ts'

export interface ProductResponse {
  id: number
  sku: string
  name: string
  description: string
  imageUrl?: string
  unitPrice: number
  quantity: number
  reorderLevel: number
  lowStock: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductRequest {
  sku?: string
  name: string
  description: string
  imageUrl?: string
  unitPrice: number
  quantity: number
  reorderLevel: number
}

export async function listProducts() {
  const { data } = await api.get<ProductResponse[]>('/api/products')
  return data
}

export async function getProduct(id: number | string) {
  const { data } = await api.get<ProductResponse>(`/api/products/${id}`)
  return data
}

export async function getProductBySku(sku: string) {
  const { data } = await api.get<ProductResponse>(`/api/products/sku/${sku}`)
  return data
}

export async function createProduct(body: ProductRequest) {
  const { data } = await api.post<ProductResponse>('/api/products', body)
  return data
}

export async function updateProduct(id: number, body: ProductRequest) {
  const { data } = await api.put<ProductResponse>(`/api/products/${id}`, body)
  return data
}

export async function deleteProduct(id: number) {
  await api.delete(`/api/products/${id}`)
}

