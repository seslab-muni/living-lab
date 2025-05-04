import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'node_modules/bcryptjs';
import { AuthPayload } from './types/auth-jwtPayload';
import { JwtService } from '@nestjs/jwt';
import { VerificationService } from 'src/verification/verification.service';
import { EmailService } from 'src/email/email.service';
import { SendEmailDto } from 'src/email/dto/email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
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
      return;
    }
    const createdUser = await this.userService.create(registerForm);
    console.log('createdUser', createdUser);
    const verificationCode =
      await this.verificationService.generateVerificationCode(createdUser.id);
    const email: SendEmailDto = {
      recipient: registerForm.email,
      subject: 'BVV LL Platfrom: Confirm your email',
      html: `<p>Here is your verification code: <strong>${verificationCode}</strong> you can use it to verify your email.</p>`,
      text: `Here is your verification code: ${verificationCode} you can use it to verify your email.`,
    };
    await this.emailService.sendEmail(email);
  }

  async verifyEmail(id: string, code: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('No user found!');
    }
    await this.verificationService.verifyCode(id, code);
    await this.userService.updateUser(id, { active: true });
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('No user or password are incorrect!');
    }

    return { id: user.id, name: user.firstName };
  }

  async login(user: { id: string; name: string }) {
    const accessToken = await this.generateTokens(user.id);
    return { id: user.id, name: user.name, accessToken };
  }

  async generateTokens(id: string) {
    const payload: AuthPayload = { sub: id };
    const accessToken = await this.jwtService.signAsync(payload);
    return accessToken;
  }

  async validateJwtUser(id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new UnauthorizedException('No user found!');
    }
    return { id: user.id };
  }

  async invalidaterefreshToken(id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new UnauthorizedException('No user found!');
    }
  }
}
