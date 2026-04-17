import { Test, TestingModule } from '@nestjs/testing';
import { EurekaService } from './eureka.service.js'; // Ensure the .js extension if using ESM
import { ConfigService } from '@nestjs/config'; // CRITICAL: Added this import
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EurekaService', () => {
  let service: EurekaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EurekaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<EurekaService>(EurekaService);
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should attempt to register with Eureka on register()', async () => {
    mockedAxios.post.mockResolvedValue({ status: 204 });

    await service.register();

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/eureka/apps/DOCUMENT-GEN-SERVICE'),
        expect.objectContaining({
          instance: expect.objectContaining({
            app: 'DOCUMENT-GEN-SERVICE',
            status: 'UP',
          }),
        }),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        }),
    );
  });

  it('should not throw when Eureka registration fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Connection refused'));

    await expect(service.register()).resolves.not.toThrow();
  });

  it('should deregister from Eureka on module destroy', async () => {
    mockedAxios.delete.mockResolvedValue({ status: 200 });

    await service.onModuleDestroy();

    expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/eureka/apps/DOCUMENT-GEN-SERVICE'),
    );
  });

  it('should not throw when Eureka deregistration fails', async () => {
    mockedAxios.delete.mockRejectedValue(new Error('Connection refused'));

    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });
});