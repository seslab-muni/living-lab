import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailDto {
  @ApiProperty({ example: 'email@emailprovider.com' })
  @IsEmail()
  email: string;
}
