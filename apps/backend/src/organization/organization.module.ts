import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import { OrganizationMailService } from './organization-mail.service';
import { OrganizationSchedulerService } from './organization.scheduler';
import { OrganizationController } from './organization.controller';
import { JoinRequest } from './entities/join-request.entity';
import { User } from '../user/entities/user.entity';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { AuthModule } from '../auth/auth.module';

import { DomainService } from 'src/domain-role/domain.service';
import { Role } from 'src/domain-role/entities/role.entity';
import { Domain } from 'src/domain-role/entities/domain.entity';
import { UserService } from 'src/user/user.service';
import { RolesGuard } from 'src/domain-role/guards/access-control.guard';
import { OrganizationMiddleware } from './organization.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      JoinRequest,
      User,
      OrganizationInvitation,
      Domain,
      Role,
    ]),
    forwardRef(() => AuthModule),
    EmailModule,
    ConfigModule,
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    DomainService,
    UserService,
    RolesGuard,
    OrganizationMailService,
    OrganizationSchedulerService,
  ],
  exports: [OrganizationService],
})
export class OrganizationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(OrganizationMiddleware)
      .exclude(
        { path: 'organizations', method: RequestMethod.ALL },
        { path: 'organizations/search', method: RequestMethod.ALL },
        { path: 'organizations/duplicates', method: RequestMethod.ALL },
        { path: 'organizations/slug-preview', method: RequestMethod.ALL },
        { path: 'organizations/invitations/accept', method: RequestMethod.ALL },
        { path: 'organizations/invitations/reject', method: RequestMethod.ALL },
        { path: 'organizations/invitations/:token', method: RequestMethod.ALL },
      )
      .forRoutes(
        { path: 'organizations/:idOrSlug', method: RequestMethod.ALL },
        { path: 'organizations/:idOrSlug/*path', method: RequestMethod.ALL },
      );
  }
}
