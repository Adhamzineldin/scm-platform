import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { PdfService } from './pdf.service.js';
import type { OrderReceiptDto } from './dto/order-receipt.dto.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('order-receipt')
  async generateOrderReceipt(
    @Body() orderData: OrderReceiptDto,
    @Res() res: Response,
  ): Promise<void> {
    if (
      !orderData.orderId ||
      !orderData.items ||
      orderData.items.length === 0
    ) {
      throw new HttpException(
        'Order ID and at least one item are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const pdfBuffer =
        await this.pdfService.generateOrderReceipt(orderData);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=order-receipt-${orderData.orderId}.pdf`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.end(pdfBuffer);
    } catch {
      throw new HttpException(
        'Failed to generate PDF receipt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
