import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateDatabaseEnvironment } from './utils/environment';
import * as dotenv from 'dotenv';

async function bootstrap(): Promise<void> {
  dotenv.config();
  validateDatabaseEnvironment();

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
