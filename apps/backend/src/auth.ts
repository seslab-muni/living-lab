import { Body, Controller, Post } from '@nestjs/common';
import { RegisterForm } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  @Post('register')
  register(@Body() body: RegisterForm) {
    console.log('Received body:', body);
    return {
      message: 'User received successfully',
      data: body,
    };
  }
}
