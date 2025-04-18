import { IsEmail, IsNotEmpty, IsString, IsBoolean, MaxLength, MinLength } from 'class-validator';

export class RegisterForm {
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(20)
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(30)
  @IsString()
  lastName: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8)
  // @IsStrongPassword?
  password: string

  @IsNotEmpty({ message: 'Password confirmation is required' })
  passwordConfirm: string
  
  @IsBoolean()
  agree: boolean
}