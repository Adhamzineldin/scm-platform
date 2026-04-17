import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service.js';
import type { OrderReceiptDto } from './dto/order-receipt.dto.js';
import { PassThrough } from 'stream';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  const buildValidOrder = (): OrderReceiptDto => ({
    orderId: 1001,
    userId: 'user-42',
    shippingAddress: '123 Main St, Springfield, IL 62701',
    status: 'CREATED',
    idempotencyKey: 'idem-key-abc-123',
    createdAt: '2026-04-17T10:30:00',
    items: [
      { sku: 'SKU-001', quantity: 2, unitPrice: 29.99 },
      { sku: 'SKU-002', quantity: 1, unitPrice: 49.99 },
    ],
  });

 
  const capturePdfStream = (order: OrderReceiptDto): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const mockResponse = new PassThrough();
      const chunks: Buffer[] = [];

      Object.assign(mockResponse, {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      });

      mockResponse.on('data', (chunk: Buffer) => chunks.push(chunk));
      mockResponse.on('end', () => resolve(Buffer.concat(chunks)));
      mockResponse.on('error', reject);

      service.generateOrderReceipt(order, mockResponse as any);
    });
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a valid PDF buffer starting with %PDF-', async () => {
    const buffer = await capturePdfStream(buildValidOrder());

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  it('should generate PDF for a single-item order', async () => {
    const order = buildValidOrder();
    order.items = [{ sku: 'SINGLE-SKU', quantity: 10, unitPrice: 5.0 }];

    const buffer = await capturePdfStream(order);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  });

  it('should generate PDF when items have no prices', async () => {
    const order = buildValidOrder();
    order.items = [
      { sku: 'SKU-NO-PRICE-1', quantity: 3 },
      { sku: 'SKU-NO-PRICE-2', quantity: 7 },
    ];

    const buffer = await capturePdfStream(order);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should generate PDF with custom company branding', async () => {
    const order = buildValidOrder();
    order.companyName = 'Acme Corp';
    order.companyAddress = '456 Business Blvd';
    order.companyPhone = '+1-555-0100';

    const buffer = await capturePdfStream(order);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle a large order with 20 items', async () => {
    const order = buildValidOrder();
    order.items = Array.from({ length: 20 }, (_, i) => ({
      sku: `SKU-BULK-${String(i + 1).padStart(3, '0')}`,
      quantity: i + 1,
      unitPrice: 10.0 + i,
    }));

    const buffer = await capturePdfStream(order);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle special characters in shipping address', async () => {
    const order = buildValidOrder();
    order.shippingAddress = '123 Stra\u00dfe, M\u00fcnchen, Germany & Co. <test>';

    const buffer = await capturePdfStream(order);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});