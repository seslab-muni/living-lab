import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: '8855307864b18c4a590b31c8f61b1499',
    description: 'Code recieved in an email to verify the user',
  })
  @IsNotEmpty({ message: 'Code is required' })
  code: string;

  @ApiProperty({
    example: 'StrongPass123',
    description: 'Password with at least 8 characters',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  password: string;

  @ApiProperty({
    example: 'StrongPass123',
    description: 'Password confirmation; must match password',
  })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  passwordConfirm: string;
}
