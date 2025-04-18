import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseDevConfig from './configuration/database-dev.config';
import { AuthController } from './auth';
import { WelcomeController } from './welcome';

@Module({
  imports: [TypeOrmModule.forRoot(databaseDevConfig)],
  controllers: [AuthController, WelcomeController],
  providers: [],
})
export class AppModule {}
