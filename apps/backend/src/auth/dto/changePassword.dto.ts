import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Code is required' })
  code: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8)
  password: string;

  @IsNotEmpty({ message: 'Password confirmation is required' })
  passwordConfirm: string;
}
