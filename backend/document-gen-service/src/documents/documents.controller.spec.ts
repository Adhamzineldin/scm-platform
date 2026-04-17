import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller.js';
import { PdfService } from './pdf.service.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { OrderReceiptDto } from './dto/order-receipt.dto.js';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let pdfService: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: PdfService,
          useValue: {
            generateOrderReceipt: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    pdfService = module.get<PdfService>(PdfService);
  });

  const mockOrderData: OrderReceiptDto = {
    orderId: 1001,
    userId: 'user-42',
    shippingAddress: '123 Main St',
    status: 'CREATED',
    idempotencyKey: 'idem-key-abc-123',
    createdAt: '2026-04-17T10:30:00',
    items: [{ sku: 'SKU-001', quantity: 2, unitPrice: 29.99 }],
  };

  const createMockResponse = (): Response => {
    const res: Partial<Response> = {};
    res.set = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.headersSent = false;
    return res as Response;
  };

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should set headers and send the PDF buffer', async () => {
    const res = createMockResponse();
    const fakeBuffer = Buffer.from('%PDF-1.7 fake');

    jest
      .spyOn(pdfService, 'generateOrderReceipt')
      .mockResolvedValue(fakeBuffer);

    await controller.generateOrderReceipt(mockOrderData, res);

    expect(pdfService.generateOrderReceipt).toHaveBeenCalledWith(mockOrderData);
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=order-receipt-${mockOrderData.orderId}.pdf`,
      'Content-Length': fakeBuffer.length,
    });
    expect(res.end).toHaveBeenCalledWith(fakeBuffer);
  });

  it('should throw HttpException when pdfService rejects', async () => {
    const res = createMockResponse();

    jest
      .spyOn(pdfService, 'generateOrderReceipt')
      .mockRejectedValue(new Error('PDFKit crash'));

    await expect(
      controller.generateOrderReceipt(mockOrderData, res),
    ).rejects.toThrow(
      new HttpException(
        'Failed to generate PDF receipt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );
  });
});