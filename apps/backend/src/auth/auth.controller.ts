import { Body, Controller, Post } from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}
  @Post('register')
  register(@Body() registerForm: RegisterFormDto) {
    return this.userService.create(registerForm);
  }
}
