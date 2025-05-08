import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength } from 'class-validator';

export class NameDto {
  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @MaxLength(20, { message: 'First name is too long' })
  @IsNotEmpty({ message: 'Name is required' })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @MaxLength(30, { message: 'Last name is too long' })
  @IsNotEmpty({ message: 'Name is required' })
  lastName: string;
}
