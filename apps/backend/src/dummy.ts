import { Body, Controller, Post } from '@nestjs/common';
import { NewUser } from './register';

@Controller('auth')
export class AuthController {
  @Post('register')
  register(@Body() body: NewUser) {
    console.log('Received body:', body);
    return {
      message: 'User received successfully',
      data: body,
    };
  }
}
