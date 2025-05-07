import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import express from 'express';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerForm: RegisterFormDto) {
    const userId = await this.authService.registerUser(registerForm);
    return { message: 'The request was successfully processed', id: userId };
  }

  @Public()
  @Post('verify/:id')
  async verify(
    @Param() params: { id: string },
    @Body() body: { code: string },
  ) {
    await this.authService.verifyEmail(params.id, body.code);
    return { message: 'The request was successfully processed' };
  }

  @Public()
  @Post('email-exists')
  async checkEmail(@Body() body: { email: string }) {
    const id = await this.authService.checkEmail(body.email);
    return { message: 'The request was successfully processed', id: id };
  }

  @Public()
  @Post('change-password/:id')
  async changePassword(
    @Param() params: { id: string },
    @Body() body: ChangePasswordDto,
  ) {
    await this.authService.changePassword(params.id, body);
    return { message: 'The request was successfully processed' };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: express.Request) {
    return this.authService.login(req.user as { id: string; name: string });
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Get('refresh')
  refreshTokens(@Req() req: express.Request) {
    return req.user;
  }

  @Get('logout')
  logout(@Req() req: express.Request) {
    return this.authService.invalidateRefreshToken(
      (req.user as { id: string; name: string }).id,
    );
  }
}
