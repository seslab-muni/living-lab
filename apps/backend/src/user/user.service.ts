import { Injectable, NotFoundException } from '@nestjs/common';
import { RegisterFormDto } from 'src/auth/dto/register.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { NameDto } from './dto/change-name.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(registerForm: RegisterFormDto): Promise<User> {
    const { password, ...form } = registerForm;
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      ...form,
      password: hashedPassword,
    });
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email,
        active: true,
      },
    });
  }

  async findById(id: string, active: boolean): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        id: id,
        active: active,
      },
    });
  }

  async activateUser(id: string, arg1: { active: boolean }) {
    await this.userRepository.update(id, arg1);
  }

  async changeAdminRights(id: string, makeAdmin: boolean) {
    await this.userRepository.update(id, { isAdmin: makeAdmin });
  }

  async updateUser(id: string, body: NameDto) {
    const user = await this.findById(id, true);
    if (!user) {
      throw new Error('User not found');
    }
    await this.userRepository.update(id, {
      firstName: body.firstName,
      lastName: body.lastName,
    });
  }

  async isPasswordValid(id: string, password: string) {
    const user = await this.findById(id, true);
    if (!user) {
      return false;
    }
    return await bcrypt.compare(password, user.password);
  }

  async changePassword(id: string, password: string) {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    await this.userRepository.update(id, { password: hashedPassword });
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    if (refreshToken === null) {
      return this.userRepository.update(id, { refreshToken: null });
    }
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    return await this.userRepository.update(id, {
      refreshToken: hashedRefreshToken,
    });
  }

  async getAllActive() {
    return await this.userRepository.findBy({
      active: true,
    });
  }

  async getUserRoles(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException("User doesn't exist");
    }
    return user.roles.map((r) => ({ domainId: r.domainId, role: r.name }));
  }
}
