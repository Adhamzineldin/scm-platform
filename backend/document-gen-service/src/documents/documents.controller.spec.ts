import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { PdfService } from './pdf.service';
import type { OrderReceiptDto } from './dto/order-receipt.dto';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let pdfService: PdfService;

  const mockResponse = () => {
    const res: any = {};
    res.set = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [PdfService],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    pdfService = module.get<PdfService>(PdfService);
  });

  const buildValidOrder = (): OrderReceiptDto => ({
    orderId: 1001,
    userId: 'user-42',
    shippingAddress: '123 Main St',
    status: 'CREATED',
    idempotencyKey: 'key-123',
    createdAt: '2026-04-17T10:30:00',
    items: [{ sku: 'SKU-001', quantity: 2, unitPrice: 29.99 }],
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should generate PDF and set correct response headers', async () => {
    const res = mockResponse();
    await controller.generateOrderReceipt(buildValidOrder(), res);

    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=order-receipt-1001.pdf',
      }),
    );
    expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('should throw 400 when orderId is missing', async () => {
    const res = mockResponse();
    const order = { ...buildValidOrder(), orderId: undefined } as any;

    await expect(
      controller.generateOrderReceipt(order, res),
    ).rejects.toThrow(HttpException);

    await expect(
      controller.generateOrderReceipt(order, res),
    ).rejects.toMatchObject({
      response: 'Order ID and at least one item are required',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('should throw 400 when items array is empty', async () => {
    const res = mockResponse();
    const order = { ...buildValidOrder(), items: [] };

    await expect(
      controller.generateOrderReceipt(order, res),
    ).rejects.toThrow(HttpException);
  });

  it('should throw 400 when items is undefined', async () => {
    const res = mockResponse();
    const order = { ...buildValidOrder(), items: undefined } as any;

    await expect(
      controller.generateOrderReceipt(order, res),
    ).rejects.toThrow(HttpException);
  });

  it('should throw 500 when PDF generation fails internally', async () => {
    const res = mockResponse();
    jest
      .spyOn(pdfService, 'generateOrderReceipt')
      .mockRejectedValue(new Error('PDFKit crash'));

    await expect(
      controller.generateOrderReceipt(buildValidOrder(), res),
    ).rejects.toMatchObject({
      response: 'Failed to generate PDF receipt',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});
