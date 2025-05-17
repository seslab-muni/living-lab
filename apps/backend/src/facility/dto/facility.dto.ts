import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class FacilityDto {
  @ApiProperty({
    example: 'FI',
    description: 'Facility name (max length 50 chracters).',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(50)
  @IsString()
  name: string;
}
