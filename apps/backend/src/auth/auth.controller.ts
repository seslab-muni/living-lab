import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import express from 'express';
import { UUID } from 'crypto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
    return this.authService.login(req.user as { id: UUID; name: string });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile() {
    return { message: 'This is a protected route' };
  }
}
