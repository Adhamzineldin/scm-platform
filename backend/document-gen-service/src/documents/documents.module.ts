import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { PdfService } from './pdf.service.js';

@Module({
  controllers: [DocumentsController],
  providers: [PdfService],
})
export class DocumentsModule {}
