import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SendEmailDto } from './dto/email.dto';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('MAIL_HOST'),
      port: config.get<number>('MAIL_PORT'),
      secure: config.get<boolean>('MAIL_SECURE'),
      auth: {
        user: config.get('MAIL_USER'),
        pass: config.get('MAIL_PASS'),
      },
    });
  }

  async sendEmail(sendEmail: SendEmailDto): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Your App" <${this.config.get('MAIL_FROM')}>`,
        to: sendEmail.recipient,
        subject: sendEmail.subject,
        html: sendEmail.html,
        text: sendEmail.text,
      });
      this.logger.log(
        `Email sent to ${sendEmail.recipient} [${sendEmail.subject}]`,
      );
    } catch (err) {
      this.logger.error(`Failed to send email to ${sendEmail.recipient}`, err);
      throw err;
    }
  }
}
