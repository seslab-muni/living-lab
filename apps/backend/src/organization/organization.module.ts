import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entity/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
})
export class OrganizationModule {}
