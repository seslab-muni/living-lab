import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from './entities/facility.entity';
import { FacilityController } from './facility.controller';
import { FacilityService } from './facility.service';
import { DomainService } from '../domain-role/domain.service';
import { Role } from 'src/domain-role/entities/role.entity';
import { Domain } from 'src/domain-role/entities/domain.entity';
import { UserService } from 'src/user/user.service';
import { RolesGuard } from 'src/domain-role/guards/access-control.guard';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Facility, Domain, Role, User])],
  controllers: [FacilityController],
  providers: [FacilityService, DomainService, UserService, RolesGuard],
})
export class FacilityModule {}
