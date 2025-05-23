import * as crypto from 'crypto';
import { VerificationToken } from './entity/verification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class VerificationService {
  private readonly tokenExpirationMinutes = 7;
  constructor(
    @InjectRepository(VerificationToken)
    private readonly tokenRepository: Repository<VerificationToken>,
  ) {}

  async generateVerificationCode(userId: string) {
    const recentToken = await this.tokenRepository.findOne({
      where: {
        userId,
        expiresAt: MoreThan(new Date(Date.now() + 10 * 1000)),
      },
    });
    if (recentToken) {
      throw new UnprocessableEntityException(
        `A verification code was already sent to this user in the last ${this.tokenExpirationMinutes} minutes.`,
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
    const token = await this.tokenRepository.findOne({
      where: {
        userId,
        expiresAt: MoreThan(
          new Date(Date.now() - this.tokenExpirationMinutes * 60 * 1000),
        ),
      },
    });
    if (!token) {
      throw new UnprocessableEntityException(
        'No verification token found for this user.',
      );
    }
    if (!(await bcrypt.compare(code, token.code))) {
      throw new UnprocessableEntityException(
        'Invalid token. Please restart the verification process.',
      );
    }
    await this.tokenRepository.delete(token.id);
  }
}
