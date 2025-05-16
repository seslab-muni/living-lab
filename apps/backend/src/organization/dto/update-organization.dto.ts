import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  companyId?: number;

  @IsOptional()
  @IsString()
  companyName?: string;
}
