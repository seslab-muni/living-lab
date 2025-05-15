import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  companyId: number;

  @IsString()
  companyName: string;
}
