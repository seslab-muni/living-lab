import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(/^\d{8}$/, {
    message: 'IČO must be exactly 8 digits',
  })
  companyId?: string;

  @IsOptional()
  @IsString()
  organizationAlias?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
