import { Body, Controller, Post } from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async register(@Body() registerForm: RegisterFormDto) {
    await this.authService.registerUser(registerForm);
    return { message: 'The request was successfully processed' };
  }
}
