import { Test, TestingModule } from '@nestjs/testing';
import { EurekaService } from './eureka.service';

describe('EurekaService', () => {
  let service: EurekaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EurekaService],
    }).compile();

    service = module.get<EurekaService>(EurekaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
