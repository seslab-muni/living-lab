import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationService } from './verification.service';
import { VerificationToken } from './entity/verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationToken])],
  controllers: [],
  providers: [VerificationService],
})
export class VerificationModule {}
