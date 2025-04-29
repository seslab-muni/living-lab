import { Injectable } from '@nestjs/common';
import { RegisterFormDto } from 'src/auth/dto/register.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly saltRounds: number = 10,
  ) {}

  async create(registerForm: RegisterFormDto): Promise<User> {
    /**
     * Creates a user from register form
     * @param registerForm The filled out register form
     * @returns a promise of a User
     */
    const { password, ...form } = registerForm;
    const salt = await bcrypt.genSalt(this.saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      ...form,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email,
        active: true,
      },
    });
  }
}
