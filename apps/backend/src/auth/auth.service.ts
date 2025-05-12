import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcryptjs';
import { AuthPayload } from './types/auth-jwt-payload';
import { JwtService } from '@nestjs/jwt';
import { VerificationService } from 'src/verification/verification.service';
import { EmailService } from 'src/email/email.service';
import { SendEmailDto } from 'src/email/dto/email.dto';
import { randomUUID } from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';
import refreshConfig from 'src/configuration/refresh.config';
import * as config from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
    @Inject(refreshConfig.KEY)
    private readonly refreshTokenConfig: config.ConfigType<
      typeof refreshConfig
    >,
  ) {}

  async registerUser(registerForm: RegisterFormDto) {
    const user = await this.userService.findByEmail(registerForm.email);
    if (user !== null) {
      const email: SendEmailDto = {
        recipient: registerForm.email,
        subject: 'BVV LL Platfrom: Email already registered',
        html: `<p>This email is already registered. Please use another email, if you want to register.</p>`,
        text: 'This email is already registered. Please use another email, if you want to register.',
      };
      await this.emailService.sendEmail(email);
      return user.id;
    }
    const createdUser = await this.userService.createUser(registerForm);
    const verificationCode =
      await this.verificationService.generateVerificationCode(createdUser.id);
    const email: SendEmailDto = {
      recipient: registerForm.email,
      subject: 'BVV LL Platfrom: Confirm your email',
      html: `<p>Here is your verification code: <strong>${verificationCode}</strong> you can use it to verify your email.</p>`,
      text: `Here is your verification code: ${verificationCode} you can use it to verify your email.`,
    };
    await this.emailService.sendEmail(email);
    return createdUser.id;
  }

  async verifyEmail(id: string, code: string) {
    const user = await this.userService.findById(id, false);
    if (!user) {
      throw new NotFoundException('No user found!');
    }
    await this.verificationService.verifyCode(id, code);
    await this.userService.activateUser(id, { active: true });
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Email or password are incorrect!');
    }
    return { id: user.id, name: user.firstName };
  }

  async login(user: { id: string; name: string }) {
    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    const userData = await this.userService.findById(user.id, true);
    if (!userData) {
      throw new NotFoundException('No user found!');
    }
    await this.userService.updateRefreshToken(user.id, refreshToken);
    return {
      user: { id: user.id, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  async generateTokens(id: string) {
    const payload: AuthPayload = { sub: id };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.refreshTokenConfig.secret,
        algorithm: 'HS256',
        expiresIn: this.refreshTokenConfig.expiresIn,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async validateJwtUser(id: string) {
    const user = await this.userService.findById(id, true);
    if (!user) {
      throw new UnauthorizedException('No user found!');
    }
    return { id: user.id };
  }

  async invalidateRefreshToken(id: string) {
    const user = await this.userService.findById(id, true);
    if (!user) {
      throw new UnauthorizedException('No user found!');
    }

    await this.userService.updateRefreshToken(id, null);
  }

  async checkInactiveEmail(recipient: string) {
    const user = await this.userService.findByEmail(recipient);
    if (!user) {
      return { id: randomUUID() };
    }
    const verificationCode =
      await this.verificationService.generateVerificationCode(user.id);
    const email: SendEmailDto = {
      recipient: recipient,
      subject: 'BVV LL Platfrom: Change password',
      html: `<p>Here is your verification code: <strong>${verificationCode}</strong> you can use it to change your password.</p>`,
      text: `Here is your verification code: ${verificationCode} you can use it to change your password.`,
    };
    await this.emailService.sendEmail(email);
    return { id: user.id };
  }
  async changePassword(id: string, body: ChangePasswordDto) {
    const user = await this.userService.findById(id, true);
    if (!user) {
      throw new NotFoundException('No user found!');
    }
    await this.verificationService.verifyCode(id, body.code);
    await this.userService.changePassword(id, body.password);
  }

  async validateRefreshTokenValid(userId: string, token: string) {
    const user = await this.userService.findById(userId, true);
    if (!user) {
      throw new NotFoundException('No user found!');
    }
    if (!(await bcrypt.compare(token, user.password))) {
      throw new UnauthorizedException('Refresh token is invalid!');
    }
    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    await this.userService.updateRefreshToken(user.id, refreshToken);
    return {
      user: { id: user.id, name: user.firstName },
      accessToken,
      refreshToken,
    };
  }
}
