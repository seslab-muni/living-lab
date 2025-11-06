import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Matches(/^\d{8}$/, {
    message: 'IČO must be exactly 8 digits',
  })
  companyId: string;

  @IsString()
  organizationAlias: string;
}
