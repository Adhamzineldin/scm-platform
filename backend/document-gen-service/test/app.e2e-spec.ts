import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Document Gen Service (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET) should return UP', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('UP');
        expect(res.body.service).toBe('document-gen-service');
      });
  });

  it('/api/documents/order-receipt (POST) should return PDF', () => {
    return request(app.getHttpServer())
      .post('/api/documents/order-receipt')
      .send({
        orderId: 1,
        userId: 'user-1',
        shippingAddress: '123 Main St',
        status: 'CREATED',
        idempotencyKey: 'key-1',
        createdAt: '2026-04-17T10:00:00',
        items: [{ sku: 'SKU-001', quantity: 2, unitPrice: 19.99 }],
      })
      .expect(200)
      .expect('Content-Type', 'application/pdf')
      .expect('Content-Disposition', 'attachment; filename=order-receipt-1.pdf');
  });

  it('/api/documents/order-receipt (POST) should return 400 for empty items', () => {
    return request(app.getHttpServer())
      .post('/api/documents/order-receipt')
      .send({
        orderId: 1,
        userId: 'user-1',
        shippingAddress: '123 Main St',
        status: 'CREATED',
        idempotencyKey: 'key-1',
        createdAt: '2026-04-17T10:00:00',
        items: [],
      })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
