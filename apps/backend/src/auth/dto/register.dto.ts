import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterFormDto {
  @ApiProperty({
    example: 'John',
    description: "User's first name (max 20 characters)",
  })
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(20)
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: "User's last name (max 30 characters)",
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(30)
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Valid email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password with at least 8 characters',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8)
  // Todo: @IsStrongPassword?
  password: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password confirmation; must match password',
  })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  passwordConfirm: string;

  @ApiProperty({
    example: true,
    description: 'User must agree to terms and conditions',
  })
  @IsBoolean()
  agree: boolean;
}
