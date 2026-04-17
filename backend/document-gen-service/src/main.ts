import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { EurekaService } from './eureka/eureka.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3050;
  await app.listen(port);

  const eurekaService = app.get(EurekaService);
  eurekaService.register();

  console.log(`Document Gen Service running on port ${port}`);
}
bootstrap();
