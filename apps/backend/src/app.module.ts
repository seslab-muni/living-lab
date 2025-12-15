import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseDevConfig from './configuration/database-dev.config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { OrganizationModule } from './organization/organization.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantMiddleware } from './tennant.middleware';
import { DomainModule } from './domain-role/domain.module';
import { FacilityModule } from './facility/facility.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseDevConfig),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    OrganizationModule,
    DomainModule,
    FacilityModule,
  ],
  controllers: [],

  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ← this makes JwtAuthGuard run on every route unless @Public() is used
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes(
        { path: 'domain/:domainId/*path', method: RequestMethod.ALL },
        { path: 'domain/:domainId', method: RequestMethod.ALL },
        { path: 'facilities/:domainId/*path', method: RequestMethod.ALL },
        { path: 'facilities/:domainId', method: RequestMethod.ALL },
        { path: 'projects/:domainId/*path', method: RequestMethod.ALL },
        { path: 'projects/:domainId', method: RequestMethod.ALL },
      );
  }
}
