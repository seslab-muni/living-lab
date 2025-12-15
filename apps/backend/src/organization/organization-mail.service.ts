import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { SendEmailDto } from 'src/email/dto/email.dto';

export type PendingRequest = {
  orgName: string;
  orgSlug: string;
  requester: string;
  message: string;
  link: string;
};

@Injectable()
export class OrganizationMailService {
  constructor(private readonly emailService: EmailService) {}

  async sendJoinRequestEmail(
    recipientEmail: string,
    recipientName: string,
    requesterName: string,
    orgName: string,
    requesterMessage: string,
    link: string,
  ): Promise<void> {
    const email: SendEmailDto = {
      recipient: recipientEmail,
      subject: `BVV LL Platform: New join request for ${orgName}`,
      html: `<p>Hello ${recipientName},</p>
           <p><strong>${requesterName}</strong> has requested to join <strong>${orgName}</strong>.</p>
           <p>Message:</p>
           <blockquote>${requesterMessage}</blockquote>
           <p><a href="${link}">Click here</a> to review and approve or reject the request.</p>
           <p>— BVV Living Lab System</p>`,
      text: `Hello ${recipientName}, ${requesterName} has requested to join ${orgName}.
Message: ${requesterMessage}
        Review it here: ${link}`,
    };
    await this.emailService.sendEmail(email);
  }

  async sendInvitationEmail(
    recipientEmail: string,
    orgName: string,
    link: string,
  ): Promise<void> {
    const emailDto: SendEmailDto = {
      recipient: recipientEmail,
      subject: `BVV LL Platform: Invitation to join ${orgName}`,
      html: `<p>Hello,</p>
             <p>You have been invited to join <strong>${orgName}</strong>.</p>
             <p><a href="${link}">Click here</a> to accept the invitation. This link is valid for 7 days.</p>
             <p>— BVV Living Lab System</p>`,
      text: `You have been invited to join ${orgName}. Accept here: ${link}`,
    };
    await this.emailService.sendEmail(emailDto);
  }

  async sendJoinRequestReminderEmail(
    recipientEmail: string,
    recipientName: string,
    requests: PendingRequest[],
  ): Promise<void> {
    const requestListHtml = requests
      .map(
        (r) => `
          <li>
            <strong>${r.requester}</strong> requested to join
            <strong>${r.orgName}</strong><br/>
            <em>${r.message}</em><br/>
            <a href="${r.link}">Review request</a>
          </li>`,
      )
      .join('');

    const emailHtml = `
      <p>Hello ${recipientName},</p>
      <p>You have ${requests.length} pending join request(s) awaiting review:</p>
      <ul>${requestListHtml}</ul>
      <p>— BVV Living Lab System</p>
    `;

    const emailText =
      `Hello ${recipientName}, you have ${requests.length} pending join request(s):\n\n` +
      requests
        .map(
          (r) =>
            `- ${r.requester} → ${r.orgName}\n  Message: ${r.message}\n  Review: ${r.link}`,
        )
        .join('\n\n');

    const emailDto: SendEmailDto = {
      recipient: recipientEmail,
      subject: `BVV LL Platform: You have ${requests.length} pending join request(s)`,
      html: emailHtml,
      text: emailText,
    };

    await this.emailService.sendEmail(emailDto);
  }
}
