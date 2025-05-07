import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserService } from 'src/user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from 'src/configuration/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { VerificationService } from 'src/verification/verification.service';
import { VerificationToken } from 'src/verification/entity/verification.entity';
import { EmailService } from 'src/email/email.service';
import refreshConfig from 'src/configuration/refresh.config';
import { RefreshJwtStrategy } from './strategies/refreshJwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(refreshConfig),
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([VerificationToken]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    VerificationService,
    EmailService,
    LocalStrategy,
    JwtStrategy,
    RefreshJwtStrategy,
  ],
})
export class AuthModule {}
