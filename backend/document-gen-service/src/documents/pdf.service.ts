import { Injectable } from '@nestjs/common';
import type { OrderReceiptDto, OrderItemDto } from './dto/order-receipt.dto.js';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  generateOrderReceipt(order: OrderReceiptDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.buildHeader(doc, order);
        const infoBottomY = this.buildOrderInfo(doc, order);
        const tableBottomY = this.buildItemsTable(doc, order.items, infoBottomY + 20);
        this.buildTotals(doc, order.items, tableBottomY + 20);
        this.buildFooter(doc);
        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  private buildHeader(doc: PDFKit.PDFDocument, order: OrderReceiptDto): void {
    const companyName = order.companyName ?? 'SCM Platform';
    const companyAddress =
      order.companyAddress ?? 'Logistics & Warehouse Operations';
    const companyPhone = order.companyPhone ?? 'support@scm-platform.com';

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(companyName, 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555555')
      .text(companyAddress, 50, 80)
      .text(companyPhone, 50, 95);

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#16213e')
      .text('ORDER RECEIPT', 350, 50, { align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`Receipt #${order.orderId}`, 350, 78, { align: 'right' })
      .text(`Date: ${this.formatDate(order.createdAt)}`, 350, 93, {
        align: 'right',
      });

    doc
      .moveTo(50, 120)
      .lineTo(545, 120)
      .strokeColor('#1a1a2e')
      .lineWidth(2)
      .stroke();
  }

  private buildOrderInfo(
    doc: PDFKit.PDFDocument,
    order: OrderReceiptDto,
  ): number {
    const startY = 140;

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Order Details', 50, startY);

    doc.fontSize(10).font('Helvetica').fillColor('#333333');

    const details = [
      { label: 'Order ID:', value: `#${order.orderId}` },
      { label: 'Reference #:', value: order.referenceNumber },
      { label: 'Status:', value: order.status },
      { label: 'Customer ID:', value: order.userId },
    ];

    let y = startY + 20;
    for (const detail of details) {
      doc.font('Helvetica-Bold').text(detail.label, 50, y, { continued: true });
      doc.font('Helvetica').text(` ${detail.value}`);
      y += 18;
    }

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Ship To', 350, startY);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(order.shippingAddress, 350, startY + 20, { width: 195 });

    doc
      .moveTo(50, y + 15)
      .lineTo(545, y + 15)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    return y + 15;
  }

  private buildItemsTable(
    doc: PDFKit.PDFDocument,
    items: OrderItemDto[],
    tableTop: number,
  ): number {
    this.drawTableHeader(doc, tableTop);

    doc.font('Helvetica').fillColor('#333333');
    let y = tableTop + 30;
    const rowHeight = 25;
    const bottomSafeY = doc.page.height - doc.page.margins.bottom - 100;

    items.forEach((item, index) => {
      if (y + rowHeight > bottomSafeY) {
        doc.addPage();
        this.drawTableHeader(doc, 70);
        y = 100;
      }

      const unitPrice = item.unitPrice ?? 0;
      const lineTotal = unitPrice * item.quantity;

      if (index % 2 === 0) {
        doc.rect(50, y - 5, 495, 22).fillColor('#f8f9fa').fill();
      }

      doc.fillColor('#333333').fontSize(10);
      doc.text(`${index + 1}`, 60, y, { width: 30 });
      doc.text(item.sku, 100, y, { width: 180 });
      doc.text(`${item.quantity}`, 290, y, { width: 80, align: 'center' });
      doc.text(unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : '-', 380, y, {
        width: 80,
        align: 'right',
      });
      doc.text(lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '-', 470, y, {
        width: 70,
        align: 'right',
      });

      y += rowHeight;
    });

    doc
      .moveTo(50, y + 5)
      .lineTo(545, y + 5)
      .strokeColor('#1a1a2e')
      .lineWidth(1)
      .stroke();

    return y + 5;
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, tableTop: number): void {
    doc.rect(50, tableTop - 5, 495, 25).fillColor('#1a1a2e').fill();

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('#', 60, tableTop, { width: 30 });
    doc.text('SKU', 100, tableTop, { width: 180 });
    doc.text('Quantity', 290, tableTop, { width: 80, align: 'center' });
    doc.text('Unit Price', 380, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 470, tableTop, { width: 70, align: 'right' });
  }

  private buildTotals(
    doc: PDFKit.PDFDocument,
    items: OrderItemDto[],
    startY: number,
  ): void {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + (item.unitPrice ?? 0) * item.quantity,
      0,
    );

    const y = startY;
    const totalsHeight = subtotal > 0 ? 70 : 20;
    const bottomSafeY = doc.page.height - doc.page.margins.bottom - 90;

    if (y + totalsHeight > bottomSafeY) {
      doc.addPage();
    }

    const totalsY = y + totalsHeight > bottomSafeY ? 70 : y;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`Total Items: ${totalItems}`, 350, totalsY, { align: 'right', width: 195 });

    if (subtotal > 0) {
      doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 350, totalsY + 20, {
        align: 'right',
        width: 195,
      });

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1a1a2e')
        .text(`Total: $${subtotal.toFixed(2)}`, 350, totalsY + 45, {
          align: 'right',
          width: 195,
        });
    }
  }

  private buildFooter(doc: PDFKit.PDFDocument): void {
    const minFooterTop = doc.page.height - 80;
    if (doc.y > minFooterTop - 20) {
      doc.addPage();
    }

    const pageHeight = doc.page.height;
    const footerStartY = pageHeight - doc.page.margins.bottom - 42;

    doc
      .moveTo(50, pageHeight - 80)
      .lineTo(545, pageHeight - 80)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        'This is a system-generated receipt from SCM Platform.',
        50,
        footerStartY,
        { align: 'center', width: 495 },
      )
      .text(
        'For questions or concerns, contact support@scm-platform.com',
        50,
        footerStartY + 12,
        { align: 'center', width: 495 },
      )
      .text(
        `Generated on ${new Date().toISOString()}`,
        50,
        footerStartY + 24,
        { align: 'center', width: 495 },
      );
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
