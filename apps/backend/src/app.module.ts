import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseDevConfig from './configuration/database-dev.config';
import { WelcomeController } from './welcome';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { OrganizationModule } from './organization/organization.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseDevConfig),
    UserModule,
    AuthModule,
    OrganizationModule,
  ],
  controllers: [WelcomeController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ← this makes JwtAuthGuard run on every route unless @Public() is used
    },
  ],
})
export class AppModule {}
