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
  @Matches(/^[A-Za-z0-9\s-]+$/, {
    message:
      'Organization name may contain only letters, numbers, spaces, and "-"',
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
  @Matches(/^[A-Za-z0-9\s-]+$/, {
    message:
      'Organization alias may contain only letters, numbers, spaces, and "-"',
  })
  @Matches(/^[^\d].*$/, {
    message: 'Organization alias cannot start with a number',
  })
  organizationAlias?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
