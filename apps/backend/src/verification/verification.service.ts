import * as crypto from 'crypto';
import { VerificationToken } from './entity/verification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import bcrypt from 'node_modules/bcryptjs';

@Injectable()
export class VerificationService {
  private readonly tokenExpirationMinutes = 7;
  private readonly tokenMinRequestInterval = 5;
  constructor(
    @InjectRepository(VerificationToken)
    private readonly tokenRepository: Repository<VerificationToken>,
  ) {}

  async generateVerificationCode(userId: string) {
    const recentToken = await this.tokenRepository.findOne({
      where: {
        userId,
        createdAt: MoreThan(
          new Date(Date.now() - this.tokenMinRequestInterval * 60 * 1000),
        ),
      },
    });
    if (recentToken) {
      throw new UnprocessableEntityException(
        'A verification code was already sent to this user in the last 5 minutes.',
      );
    }
    const code = crypto.randomBytes(16).toString('hex');
    const saltRounds = 10;
    const hashedCode = await bcrypt.hash(code, saltRounds);

    const tokenEntity = this.tokenRepository.create({
      userId,
      code: hashedCode,
      expiresAt: new Date(Date.now() + this.tokenExpirationMinutes * 60 * 1000),
    });

    await this.tokenRepository.save(tokenEntity);
    return code;
  }

  async verifyCode(userId: string, code: string) {
    console.log(code);
    const token = await this.tokenRepository.findOne({
      where: { userId },
    });
    if (!token) {
      throw new UnprocessableEntityException(
        'No verification token found for this user.',
      );
    }
    if (
      token.expiresAt < new Date() ||
      !(await bcrypt.compare(code, token.code))
    ) {
      throw new UnprocessableEntityException(
        'This token is invalid, register again.',
      );
    }
    await this.tokenRepository.delete(token.id);
  }
}
