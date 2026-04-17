import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return UP status with service name', () => {
    const result = controller.check();

    expect(result.status).toBe('UP');
    expect(result.service).toBe('document-gen-service');
    expect(result.timestamp).toBeDefined();
  });

  it('should return a valid ISO timestamp', () => {
    const result = controller.check();
    const parsed = new Date(result.timestamp);

    expect(parsed.getTime()).not.toBeNaN();
  });
});
