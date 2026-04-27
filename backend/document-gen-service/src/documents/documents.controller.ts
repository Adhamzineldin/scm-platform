import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { PdfService } from './pdf.service.js';
import { OrderReceiptDto } from './dto/order-receipt.dto.js';

@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private readonly pdfService: PdfService) {}

  @Post('order-receipt')
  async generateOrderReceipt(
    @Body() orderData: OrderReceiptDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const pdfBuffer = await this.pdfService.generateOrderReceipt(orderData);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=order-receipt-${orderData.orderId}.pdf`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (err) {
      this.logger.error('Failed to generate PDF receipt', err as Error);
      throw new HttpException(
        'Failed to generate PDF receipt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
