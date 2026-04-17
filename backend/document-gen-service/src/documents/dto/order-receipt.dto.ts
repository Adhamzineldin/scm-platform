export interface OrderItemDto {
  sku: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderReceiptDto {
  orderId: number;
  userId: string;
  shippingAddress: string;
  status: string;
  idempotencyKey: string;
  createdAt: string;
  items: OrderItemDto[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
}
