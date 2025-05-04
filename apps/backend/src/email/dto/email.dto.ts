export class SendEmailDto {
  recipient: string;
  subject: string;
  html?: string;
  text?: string;
}
