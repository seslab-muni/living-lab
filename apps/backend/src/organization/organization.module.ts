import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { JoinRequest } from './entities/join-request.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, JoinRequest, User])],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
