import { Module } from '@nestjs/common';
import { DocumentsModule } from './documents/documents.module.js';
import { EurekaModule } from './eureka/eureka.module.js';
import { HealthModule } from './health/health.module.js';
import {ConfigModule} from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DocumentsModule,
    EurekaModule,
    HealthModule
  ],
})
export class AppModule {}