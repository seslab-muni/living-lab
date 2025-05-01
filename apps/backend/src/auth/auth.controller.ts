import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import express from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async register(@Body() registerForm: RegisterFormDto) {
    await this.authService.registerUser(registerForm);
    return { message: 'The request was successfully processed' };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: express.Request) {
    return req.user;
  }
}
