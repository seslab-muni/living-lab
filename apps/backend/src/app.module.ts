import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseDevConfig from './configuration/database-dev.config';
import { WelcomeController } from './welcome';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseDevConfig),
    UserModule,
    AuthModule,
  ],
  controllers: [WelcomeController],
  providers: [],
})
export class AppModule {}
