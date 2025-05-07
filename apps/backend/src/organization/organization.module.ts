import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entity/organization.entity'; // Import the Organization entity

@Module({
  imports: [TypeOrmModule.forFeature([Organization])], // Use the Organization entity here
})
export class OrganizationModule {}
