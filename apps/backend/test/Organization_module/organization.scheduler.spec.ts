import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationSchedulerService } from '../../src/organization/organization.scheduler';
import { OrganizationService } from '../../src/organization/organization.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

interface MockCronJob {
  cronTime: string;
  onTick: () => void | Promise<void>;
  start: jest.Mock;
}

jest.mock('cron', () => {
  return {
    CronJob: class implements MockCronJob {
      cronTime: string;
      onTick: () => void | Promise<void>;
      start = jest.fn();
      constructor(cronTime: string, onTick: () => void | Promise<void>) {
        this.cronTime = cronTime;
        this.onTick = onTick;
      }
    },
  };
});

describe('OrganizationSchedulerService', () => {
  let service: OrganizationSchedulerService;
  let mockOrganizationService: { sendPendingJoinRequestReminders: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockSchedulerRegistry: { addCronJob: jest.Mock };

  beforeEach(async () => {
    mockOrganizationService = {
      sendPendingJoinRequestReminders: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn(),
    };
    mockSchedulerRegistry = {
      addCronJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationSchedulerService,
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = module.get<OrganizationSchedulerService>(
      OrganizationSchedulerService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers cron job on module init', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ORG_REMINDER_CRON') return '0 12 * * *';
      return undefined;
    });
    const jobMap = new Map<string, MockCronJob>();
    mockSchedulerRegistry.addCronJob.mockImplementation(
      (name: string, job: MockCronJob) => {
        jobMap.set(name, job);
      },
    );

    service.onModuleInit();

    expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'organizationReminders',
      expect.any(Object),
    );
    const job = jobMap.get('organizationReminders');
    expect(job).toBeTruthy();
    expect(job?.start).toHaveBeenCalled();
  });

  it('executes organization service method on tick', async () => {
    mockConfigService.get.mockReturnValue('0 12 * * *');
    let capturedJob: MockCronJob | undefined;
    mockSchedulerRegistry.addCronJob.mockImplementation(
      (_: string, job: MockCronJob) => {
        capturedJob = job;
      },
    );

    service.onModuleInit();

    expect(capturedJob).toBeDefined();
    if (capturedJob) {
      await capturedJob.onTick();
    }

    expect(
      mockOrganizationService.sendPendingJoinRequestReminders,
    ).toHaveBeenCalled();
  });
});
