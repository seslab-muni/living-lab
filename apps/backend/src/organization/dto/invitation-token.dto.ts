import { IsString } from 'class-validator';

export class InvitationTokenDto {
  @IsString()
  token: string;
}
