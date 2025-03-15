import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseDevConfig from './configuration/database-dev.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseDevConfig),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
