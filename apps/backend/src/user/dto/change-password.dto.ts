import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsStrongPassword } from 'class-validator';

export class PasswordDto {
  @ApiProperty({
    example: 'oldpassword',
    description: 'User old password',
  })
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @ApiProperty({
    example: 'newpassword',
    description: 'User new password',
  })
  @IsNotEmpty({ message: 'New password is required' })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  password: string;

  @ApiProperty({
    example: 'newpassword',
    description: 'User new password confirmation',
  })
  @IsNotEmpty({ message: 'New password confirmation is required' })
  passwordConfirm: string;
}
