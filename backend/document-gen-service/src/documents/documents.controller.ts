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
  generateOrderReceipt(
      @Body() orderData: OrderReceiptDto,
      @Res() res: Response,
  ): void {

    try {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=order-receipt-${orderData.orderId}.pdf`,
      });
      
      this.pdfService.generateOrderReceipt(orderData, res);
    } catch {
      throw new HttpException(
          'Failed to generate PDF receipt',
          HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
