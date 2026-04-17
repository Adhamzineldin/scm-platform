import { Module } from '@nestjs/common';
import { EurekaService } from './eureka.service.js';

@Module({
  providers: [EurekaService],
  exports: [EurekaService],
})
export class EurekaModule {}
