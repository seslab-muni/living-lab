import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateDatabaseEnvironment } from './utils/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
