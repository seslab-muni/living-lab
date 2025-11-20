import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[\p{L}0-9\s-]+$/u, {
    message:
      'Organization name may contain only letters (including diacritics), numbers, spaces, and "-"',
  })
  @Matches(/^[^\d].*$/, {
    message: 'Organization name cannot start with a number',
  })
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
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[\p{L}0-9\s-]+$/u, {
    message:
      'Organization alias may contain only letters (including diacritics), numbers, spaces, and "-"',
  })
  @Matches(/^[^\d].*$/, {
    message: 'Organization alias cannot start with a number',
  })
  organizationAlias?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
