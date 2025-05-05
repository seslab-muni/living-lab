import { Injectable } from '@nestjs/common';
import { RegisterFormDto } from 'src/auth/dto/register.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(registerForm: RegisterFormDto): Promise<User> {
    /**
     * Creates a user from register form
     * @param registerForm The filled out register form
     * @returns a promise of a User
     */
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

  async updateUser(id: string, arg1: { active: boolean }) {
    await this.userRepository.update(id, arg1);
  }
}
