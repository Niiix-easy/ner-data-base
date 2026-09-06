import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Optional: Global prefix, validation pipes, etc.
  app.setGlobalPrefix('api');

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`API is running on: http://localhost:${port}/api`);
}
bootstrap();
