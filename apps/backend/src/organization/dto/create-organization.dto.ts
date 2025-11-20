import {
  IsString,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(100, {
    message: 'Organization name must be at most 100 characters',
  })
  @Matches(/^[\p{L}0-9\s-]+$/u, {
    message:
      'Organization name may contain only letters (including diacritics), numbers, spaces, and "-"',
  })
  @Matches(/^[^\d].*$/, {
    message: 'Organization name cannot start with a number',
  })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Matches(/^\d{8}$/, {
    message: 'IČO must be exactly 8 digits',
  })
  companyId: string;

  @IsString()
  @MinLength(2, { message: 'Organization alias must be at least 2 characters' })
  @MaxLength(50, {
    message: 'Organization alias must be at most 50 characters',
  })
  @Matches(/^[\p{L}0-9\s-]+$/u, {
    message:
      'Organization alias may contain only letters (including diacritics), numbers, spaces, and "-"',
  })
  @Matches(/^[^\d].*$/, {
    message: 'Organization alias cannot start with a number',
  })
  organizationAlias: string;
}
