import { Module } from '@nestjs/common';
import { DomainService } from './domain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Domain } from './entities/domain.entity';
import { RolesGuard } from './guards/access-control.guard';
import { DomainController } from './domain.controller';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Domain, Role, User])],
  controllers: [DomainController],
  providers: [DomainService, RolesGuard, UserService],
})
export class DomainModule {}
