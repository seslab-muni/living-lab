import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'node_modules/bcryptjs';
import { AuthPayload } from './types/auth-jwtPayload';
import { JwtService } from '@nestjs/jwt';
import { UUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async registerUser(registerForm: RegisterFormDto) {
    const user = await this.userService.findByEmail(registerForm.email);
    if (user !== null) {
      // TODO: send fejk email...
      return;
    }
    await this.userService.create(registerForm);
    // TODO: send real email
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('No useer or password are incorrect!');
    }

    return { id: user.id, name: user.firstName };
  }

  async login(user: { id: UUID; name: string }) {
    console.log('login', user);
    const accessToken = await this.generateTokens(user.id);
    return { id: user.id, name: user.name, accessToken };
  }

  async generateTokens(id: UUID) {
    const payload: AuthPayload = { sub: id };
    const accessToken = await this.jwtService.signAsync(payload);
    return accessToken;
  }

  async validateJwtUser(id: UUID) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new UnauthorizedException('No user found!');
    }
    return { id: user.id };
  }

  async invalidateToken(id: UUID) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new UnauthorizedException('No user found!');
    }
  }
}
