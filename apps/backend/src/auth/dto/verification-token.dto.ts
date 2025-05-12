import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TokenDto {
  @ApiProperty({ example: '1234567890abcdef1234567890abcdef' })
  @IsString()
  token: string;
}
