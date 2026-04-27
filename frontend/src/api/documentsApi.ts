import api from './axiosInstance.ts'

export interface OrderReceiptDto {
  orderId: number
  customerName?: string
  customerEmail?: string
  shippingAddress?: string
  status?: string
  createdAt?: string
  items: { sku: string; quantity: number; unitPrice: number }[]
}

/**
 * Request a PDF order receipt from the document-gen-service.
 * Returns a Blob ready to be saved by the caller.
 */
export async function downloadOrderReceipt(payload: OrderReceiptDto): Promise<Blob> {
  const response = await api.post<Blob>('/api/documents/order-receipt', payload, {
    responseType: 'blob',
  })
  return response.data
}

/** Trigger a browser save dialog for an arbitrary blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

