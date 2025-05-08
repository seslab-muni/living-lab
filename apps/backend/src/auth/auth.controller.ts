import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import express from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { EmailDto } from './dto/email.dto';
import { TokenDto } from './dto/verification-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerForm: RegisterFormDto) {
    if (registerForm.password !== registerForm.passwordConfirm) {
      throw new Error('Passwords do not match');
    }
    const userId = await this.authService.registerUser(registerForm);
    return { message: 'The request was successfully processed', id: userId };
  }

  @Public()
  @Post('verify/:id')
  @ApiOperation({ summary: 'Verify user email' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verify(@Param() params: { id: string }, @Body() body: TokenDto) {
    await this.authService.verifyEmail(params.id, body.token);
    return { message: 'The request was successfully processed' };
  }

  @Public()
  @Post('email-exists')
  @ApiOperation({ summary: 'Check if email exists' })
  @ApiResponse({ status: 200, description: 'Email existence checked' })
  async checkEmail(@Body() body: EmailDto) {
    const id = await this.authService.checkInactiveEmail(body.email);
    return { message: 'The request was successfully processed', id: id };
  }

  @Public()
  @Put('change-password/:id')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @Param() params: { id: string },
    @Body() body: ChangePasswordDto,
  ) {
    if (body.password !== body.passwordConfirm) {
      throw new Error('Passwords do not match');
    }
    await this.authService.changePassword(params.id, body);
    return { message: 'The request was successfully processed' };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User logged in' })
  async login(@Body() loginDto: LoginDto, @Req() req: express.Request) {
    const user = await this.authService.login(
      req.user as { id: string; name: string },
    );
    return user;
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Get('refresh')
  @ApiOperation({ summary: 'Refresh authentication tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  refreshTokens(@Req() req: express.Request) {
    return req.user;
  }

  @Delete('session')
  @ApiOperation({ summary: 'Logout the current user' })
  @ApiResponse({ status: 200, description: 'User logged out' })
  async logout(@Req() req: express.Request) {
    await this.authService.invalidateRefreshToken(
      (req.user as { id: string; name: string }).id,
    );
    return { message: 'The request was successfully processed' };
  }
}
