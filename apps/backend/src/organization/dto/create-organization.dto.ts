import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  ownerId: string;

  @IsInt()
  companyId: number;

  @IsString()
  companyName: string;
}
