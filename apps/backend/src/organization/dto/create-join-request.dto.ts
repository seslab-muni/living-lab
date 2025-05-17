import { IsOptional, IsString } from 'class-validator';

export class CreateJoinRequestDto {
  @IsOptional()
  @IsString()
  message?: string;
}
