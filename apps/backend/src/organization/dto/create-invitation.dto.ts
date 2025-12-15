import { IsString, Matches } from 'class-validator';

export class CreateInvitationDto {
  @IsString()
  @Matches(
    /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(, [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})*$/,
    { message: 'Emails must be valid and separated by ", "' },
  )
  emails: string;
}
