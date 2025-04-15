import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseDevConfig from './configuration/database-dev.config';
import { AuthController } from './dummy';

@Module({
  imports: [TypeOrmModule.forRoot(databaseDevConfig)],
  controllers: [AuthController],
  providers: [],
})
export class AppModule {}
