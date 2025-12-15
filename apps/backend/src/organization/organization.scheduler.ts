import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CronExpression } from '@nestjs/schedule';
import { OrganizationService } from './organization.service';

@Injectable()
export class OrganizationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationSchedulerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly organizationService: OrganizationService,
  ) {}

  onModuleInit(): void {
    const cron = this.configService.get<string>('ORG_REMINDER_CRON');
    const days = this.configService.get<string>('ORG_REMINDER_DAYS');

    const cronExpression =
      cron && cron.trim() !== '' ? cron : CronExpression.EVERY_DAY_AT_9AM;
    const thresholdDays = Number(days ?? 7);

    this.logger.log(
      `Scheduling reminder job with expression "${cronExpression}" and threshold ${thresholdDays} days.`,
    );

    const job = new CronJob(cronExpression, async () => {
      try {
        await this.organizationService.sendPendingJoinRequestReminders();
      } catch (error) {
        this.logger.error('Error running reminder job', error);
      }
    });

    this.schedulerRegistry.addCronJob('organizationReminders', job);
    job.start();
  }
}
