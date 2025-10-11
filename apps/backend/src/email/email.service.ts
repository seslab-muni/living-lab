import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SendEmailDto } from './dto/email.dto';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private readonly logger = new Logger(EmailService.name);
  private readonly emailEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('MAIL_HOST');
    const port = config.get<number>('MAIL_PORT');
    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASS');

    this.emailEnabled = !!(host && port && user && pass);

    if (this.emailEnabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: config.get<boolean>('MAIL_SECURE'),
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.logger.warn(
        'No mail configuration found. Email sending is disabled — verification tokens will be printed to console.',
      );
    }
  }

  async sendEmail(sendEmail: SendEmailDto): Promise<void> {
    if (!this.emailEnabled) {
      this.logger.debug(`Mock email to ${sendEmail.recipient}:`);
      this.logger.debug(`Subject: ${sendEmail.subject}`);
      this.logger.debug(`Text: ${sendEmail.text}`);
      this.logger.debug(`HTML: ${sendEmail.html}`);
      return;
    }

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
