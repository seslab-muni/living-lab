import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { JoinRequest } from './entities/join-request.entity';
import { User } from '../user/entities/user.entity';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, JoinRequest, User]),
    EmailModule,
    ConfigModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
