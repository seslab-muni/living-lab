import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import type { Roles } from 'src/common/types/roles';

export class RolesDto {
  @ApiProperty({
    example: 'Owner',
    description: 'A defined role in this system',
  })
  @IsString()
  role: Roles;
}
