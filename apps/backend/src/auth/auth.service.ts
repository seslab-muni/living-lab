import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterFormDto } from './dto/register.dto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'node_modules/bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}
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
}
