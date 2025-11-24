import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationService } from '../../src/organization/organization.service';
import { Organization } from '../../src/organization/entities/organization.entity';
import {
  JoinRequest,
  JoinRequestStatus,
} from '../../src/organization/entities/join-request.entity';
import {
  InvitationStatus,
  OrganizationInvitation,
} from '../../src/organization/entities/organization-invitation.entity';
import { User } from '../../src/user/entities/user.entity';
import { DomainService } from '../../src/domain-role/domain.service';
import { OrganizationMailService } from '../../src/organization/organization-mail.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CreateOrganizationDto } from '../../src/organization/dto/create-organization.dto';
import { OrganizationDto } from '../../src/organization/dto/organization.dto';

jest.mock('crypto', () => ({
  randomUUID: () => 'token-123',
}));

jest.mock('cron', () => {
  return {
    CronJob: class {
      cronTime: string;
      onTick: () => void;
      start = jest.fn();
      constructor(cronTime: string, onTick: () => void) {
        this.cronTime = cronTime;
        this.onTick = onTick;
      }
    },
  };
});

const consoleSpy = jest
  .spyOn(global.console, 'log')
  .mockImplementation(() => undefined);

afterAll(() => {
  consoleSpy.mockRestore();
});

type RoleUser = { id: string; role: 'Owner' | 'Manager' | 'Viewer' };

const mockInvitationRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data) => data as OrganizationInvitation),
  find: jest.fn(),
};

const mockOrgRepo = {
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn((data) => data as User),
};

const mockJoinRequestRepo = {
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn((data) => data as JoinRequest),
  save: jest.fn(),
  find: jest.fn(),
};

const mockDomainService = {
  getAllUsers: jest.fn(),
  getRole: jest.fn(),
  create: jest.fn(),
  changeUserRole: jest.fn(),
  deleteRole: jest.fn(),
};

const mockMailService = {
  sendJoinRequestEmail: jest.fn(),
  sendInvitationEmail: jest.fn(),
  sendJoinRequestReminderEmail: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockSchedulerRegistry = {
  addCronJob: jest.fn(),
};

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  relation: jest.fn().mockReturnThis(),
  of: jest.fn().mockReturnThis(),
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  getCount: jest.fn(),
  getMany: jest.fn(),
};

mockOrgRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

describe('OrganizationService - Join & Reminders & Creation & Edit & Invitations & Remove', () => {
  let service: OrganizationService;
  const roleAssignments = new Map<
    string,
    { role: 'Owner' | 'Manager' | 'Viewer'; isAdmin: boolean }
  >();

  const future = () => new Date(Date.now() + 60 * 60 * 1000);
  const past = () => new Date(Date.now() - 60 * 60 * 1000);

  const orgFixture = (extras: Partial<Organization> = {}): Organization => ({
    id: 1,
    name: 'Test Org',
    slug: 'test-org',
    description: '',
    creatorId: 'creator',
    creator: { id: 'creator' } as User,
    companyId: '12345678',
    organizationAlias: 'alias',
    isPrivate: false,
    isActive: true,
    lastEdit: new Date(),
    createdAt: new Date(),
    members: [],
    ...extras,
  });

  const setupRoleContext = (
    role: 'Owner' | 'Manager' | 'Viewer' | 'Admin' = 'Owner',
    opts: { userId?: string; isAdmin?: boolean } = {},
  ) => {
    roleAssignments.clear();
    const { userId = 'user-1', isAdmin = role === 'Admin' } = opts;
    roleAssignments.set(userId, {
      role: role === 'Admin' ? 'Owner' : role,
      isAdmin,
    });
    mockUserRepo.findOne.mockImplementation(
      ({ where }: { where?: { id?: unknown } }) => {
        if (where?.id) {
          const entry = roleAssignments.get(where.id as string);
          return {
            id: where.id as string,
            isAdmin: entry?.isAdmin ?? false,
          } as User;
        }
        return null;
      },
    );
    mockDomainService.getRole.mockImplementation((id: string) => {
      return roleAssignments.get(id)?.role ?? 'Viewer';
    });
  };

  describe('membership join/leave', () => {
    it('joins active organization and assigns Viewer role', async () => {
      const org = orgFixture({ members: [] });
      mockOrgRepo.findOne.mockResolvedValue(org);
      mockOrgRepo.save.mockResolvedValue(org);
      const roleSpy = jest
        .spyOn(mockDomainService, 'changeUserRole')
        .mockResolvedValue(undefined as never);

      await service.join('user-2', org.id);

      expect(roleSpy).toHaveBeenCalledWith(String(org.id), 'user-2', 'Viewer');
      roleSpy.mockRestore();
    });

    it('throws when joining inactive org', async () => {
      mockOrgRepo.findOne.mockResolvedValue(orgFixture({ isActive: false }));

      await expect(service.join('user-2', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('prevents owners from leaving if they are the only owner', async () => {
      setupRoleContext('Owner', { userId: 'owner' });
      mockOrgRepo.findOne.mockResolvedValue(
        orgFixture({ members: [{ id: 'owner' } as User] }),
      );
      mockDomainService.getAllUsers.mockResolvedValue([
        { id: 'owner', role: 'Owner' },
      ] as any);

      await expect(service.leave('owner', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('join request lifecycle', () => {
    describe('createJoinRequest', () => {
      it('creates join request and notifies owners/managers', async () => {
        const org = orgFixture({ slug: 'org-slug', name: 'Org' });
        mockOrgRepo.findOne.mockResolvedValue(org);
        mockDomainService.getRole.mockResolvedValue(null);
        mockInvitationRepo.findOne.mockResolvedValue(null);
        mockJoinRequestRepo.findOne.mockResolvedValue(null);
        mockJoinRequestRepo.save.mockImplementation(
          (jr: JoinRequest): JoinRequest => ({
            ...jr,
            id: 55,
          }),
        );
        mockDomainService.getAllUsers.mockResolvedValue([
          { id: 'owner-1', role: 'Owner' },
          { id: 'viewer-1', role: 'Viewer' },
        ] as any);
        mockUserRepo.findOne.mockImplementation(
          ({ where }: { where?: { id?: string } }) => {
            const id = where?.id;
            if (id === 'requester') {
              return {
                id,
                email: 'requester@example.com',
                firstName: 'Req',
                lastName: 'User',
              } as User;
            }
            if (id === 'owner-1') {
              return {
                id,
                email: 'owner@example.com',
                firstName: 'Owner',
                lastName: 'One',
              } as User;
            }
            if (id === 'viewer-1') {
              return {
                id,
                email: 'viewer@example.com',
                firstName: 'Viewer',
                lastName: 'One',
              } as User;
            }
            return null;
          },
        );
        mockConfigService.get.mockReturnValue('https://front.app');

        const result = await service.createJoinRequest('requester', org.id, {
          message: ' Please add me ',
        });

        expect(mockJoinRequestRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: ' Please add me ',
            status: JoinRequestStatus.PENDING,
          }),
        );
        expect(mockMailService.sendJoinRequestEmail).toHaveBeenCalledTimes(1);
        expect(mockMailService.sendJoinRequestEmail).toHaveBeenCalledWith(
          'owner@example.com',
          'Owner',
          'Req User',
          'Org',
          'Please add me',
          expect.stringContaining('requests/55'),
        );
        expect(result.id).toBe(55);
      });

      it('throws when organization not found', async () => {
        mockOrgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.createJoinRequest('user', 999, { message: 'hi' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws when organization is private', async () => {
        mockOrgRepo.findOne.mockResolvedValue(orgFixture({ isPrivate: true }));

        await expect(
          service.createJoinRequest('user', 1, { message: 'hi' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws when user already a member', async () => {
        mockOrgRepo.findOne.mockResolvedValue(orgFixture());
        mockDomainService.getRole.mockResolvedValue('Viewer');

        await expect(
          service.createJoinRequest('user', 1, { message: 'hi' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws when pending invitation exists', async () => {
        mockOrgRepo.findOne.mockResolvedValue(orgFixture());
        mockDomainService.getRole.mockResolvedValue(null);
        mockUserRepo.findOne.mockResolvedValue({
          id: 'user',
          email: 'user@example.com',
        } as User);
        mockInvitationRepo.findOne.mockResolvedValue({
          id: 1,
        } as OrganizationInvitation);

        await expect(
          service.createJoinRequest('user', 1, { message: 'hi' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws when join request already pending', async () => {
        mockOrgRepo.findOne.mockResolvedValue(orgFixture());
        mockDomainService.getRole.mockResolvedValue(null);
        mockJoinRequestRepo.findOne.mockResolvedValue({ id: 1 } as JoinRequest);

        await expect(
          service.createJoinRequest('user', 1, { message: 'hi' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('falls back to default message when blank', async () => {
        const org = orgFixture({ slug: 'org', name: 'Org' });
        mockOrgRepo.findOne.mockResolvedValue(org);
        mockDomainService.getRole.mockResolvedValue(null);
        mockInvitationRepo.findOne.mockResolvedValue(null);
        mockJoinRequestRepo.findOne.mockResolvedValue(null);
        mockJoinRequestRepo.save.mockImplementation(
          (jr: JoinRequest): JoinRequest => ({
            ...jr,
            id: 77,
          }),
        );
        mockDomainService.getAllUsers.mockResolvedValue([
          { id: 'owner-1', role: 'Owner' },
        ] as any);
        mockUserRepo.findOne.mockImplementation(
          ({ where }: { where?: { id?: string } }) => {
            const id = where?.id;
            if (id === 'user') {
              return {
                id,
                email: 'member@example.com',
                firstName: 'Request',
                lastName: 'User',
              } as User;
            }
            if (id === 'owner-1') {
              return {
                id,
                email: 'owner@example.com',
                firstName: 'Owner',
                lastName: 'One',
              } as User;
            }
            return null;
          },
        );
        mockConfigService.get.mockReturnValue('https://front.app');

        await service.createJoinRequest('user', org.id, { message: '   ' });

        expect(mockMailService.sendJoinRequestEmail).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          '(no message provided)',
          expect.any(String),
        );
      });
    });

    describe('handleJoinRequest', () => {
      const jrEntity = (overrides: Partial<JoinRequest> = {}): JoinRequest => ({
        id: 99,
        status: JoinRequestStatus.PENDING,
        message: 'hello',
        organization: orgFixture({ id: 50 }),
        user: { id: 'applicant' } as User,
        createdAt: new Date(),
        modifiedAt: new Date(),
        modifiedBy: 'owner',
        ...overrides,
      });

      it('approves join request and calls join', async () => {
        const entity = jrEntity();
        mockJoinRequestRepo.findOneOrFail.mockResolvedValue(entity);
        mockJoinRequestRepo.save.mockResolvedValue(entity);
        setupRoleContext('Owner', { userId: 'owner' });
        const joinSpy = jest
          .spyOn(service, 'join')
          .mockResolvedValue(undefined as never);

        await service.handleJoinRequest('owner', entity.id, true);

        expect(mockJoinRequestRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: JoinRequestStatus.APPROVED }),
        );
        expect(joinSpy).toHaveBeenCalledWith(
          'applicant',
          entity.organization.id,
        );
        joinSpy.mockRestore();
      });

      it('rejects join request without calling join', async () => {
        const entity = jrEntity();
        mockJoinRequestRepo.findOneOrFail.mockResolvedValue(entity);
        mockJoinRequestRepo.save.mockResolvedValue(entity);
        setupRoleContext('Owner', { userId: 'owner' });
        const joinSpy = jest
          .spyOn(service, 'join')
          .mockResolvedValue(undefined as never);

        await service.handleJoinRequest('owner', entity.id, false);

        expect(mockJoinRequestRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: JoinRequestStatus.REJECTED }),
        );
        expect(joinSpy).not.toHaveBeenCalled();
        joinSpy.mockRestore();
      });

      it('throws when caller lacks permissions', async () => {
        const entity = jrEntity();
        mockJoinRequestRepo.findOneOrFail.mockResolvedValue(entity);
        setupRoleContext('Viewer', { userId: 'viewer' });

        await expect(
          service.handleJoinRequest('viewer', entity.id, true),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws when request already processed', async () => {
        const entity = jrEntity({ status: JoinRequestStatus.APPROVED });
        mockJoinRequestRepo.findOneOrFail.mockResolvedValue(entity);
        setupRoleContext('Owner', { userId: 'owner' });

        await expect(
          service.handleJoinRequest('owner', entity.id, true),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('join request listings', () => {
      it('returns pending requests for owners/managers', async () => {
        const org = orgFixture({ id: 10 });
        mockOrgRepo.findOne.mockResolvedValue(org);
        setupRoleContext('Owner', { userId: 'owner' });
        const jrEntities: JoinRequest[] = [
          {
            id: 1,
            status: JoinRequestStatus.PENDING,
            message: 'First',
            organization: org,
            user: {
              id: 'user-1',
              firstName: 'A',
              lastName: 'User',
            } as User,
            createdAt: new Date('2024-01-01T10:00:00Z'),
            modifiedAt: new Date('2024-01-01T11:00:00Z'),
            modifiedBy: 'owner',
          },
          {
            id: 2,
            status: JoinRequestStatus.PENDING,
            message: 'Second',
            organization: org,
            user: {
              id: 'user-2',
              firstName: 'B',
              lastName: 'User',
            } as User,
            createdAt: new Date('2024-01-02T10:00:00Z'),
            modifiedAt: new Date('2024-01-02T11:00:00Z'),
            modifiedBy: 'owner',
          },
        ];
        mockJoinRequestRepo.find.mockResolvedValue(jrEntities);

        const result = await service.findPendingRequestsForOrg('owner', org.id);

        expect(result).toHaveLength(2);
        expect(result.map((r) => r.id)).toEqual([1, 2]);
        expect(mockJoinRequestRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              organization: { id: org.id },
              status: JoinRequestStatus.PENDING,
            },
            order: { createdAt: 'ASC' },
          }),
        );
      });

      it('throws NotFound when organization missing', async () => {
        mockOrgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.findPendingRequestsForOrg('owner', 999),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws Forbidden when caller lacks role', async () => {
        const org = orgFixture({ id: 10 });
        mockOrgRepo.findOne.mockResolvedValue(org);
        setupRoleContext('Viewer', { userId: 'viewer' });

        await expect(
          service.findPendingRequestsForOrg('viewer', org.id),
        ).rejects.toThrow(ForbiddenException);
      });

      it('returns join request details for owner', async () => {
        const jr: JoinRequest = {
          id: 11,
          status: JoinRequestStatus.PENDING,
          message: 'Let me in',
          organization: orgFixture({ id: 20 }),
          user: {
            id: 'user-1',
            firstName: 'Test',
            lastName: 'User',
          } as User,
          createdAt: new Date('2024-02-01T10:00:00Z'),
          modifiedAt: new Date('2024-02-01T10:00:00Z'),
          modifiedBy: 'owner',
        };
        mockJoinRequestRepo.findOne.mockResolvedValue(jr);
        setupRoleContext('Owner', { userId: 'owner' });

        const dto = await service.findJoinRequestByIdForOwner('owner', jr.id);

        expect(dto.id).toBe(jr.id);
        expect(dto.user.firstName).toBe('Test');
        expect(dto.message).toBe('Let me in');
      });

      it('throws NotFound when join request missing', async () => {
        mockJoinRequestRepo.findOne.mockResolvedValue(null);
        setupRoleContext('Owner', { userId: 'owner' });

        await expect(
          service.findJoinRequestByIdForOwner('owner', 123),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws Forbidden when caller lacks permissions for details', async () => {
        const jr = {
          id: 11,
          status: JoinRequestStatus.PENDING,
          message: 'Let me in',
          organization: orgFixture({ id: 20 }),
          user: {
            id: 'user-1',
            firstName: 'Test',
            lastName: 'User',
          } as User,
          createdAt: new Date(),
          modifiedAt: new Date(),
          modifiedBy: 'owner',
        } as JoinRequest;
        mockJoinRequestRepo.findOne.mockResolvedValue(jr);
        setupRoleContext('Viewer', { userId: 'viewer' });

        await expect(
          service.findJoinRequestByIdForOwner('viewer', jr.id),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  const invitationFixture = (
    extras: Partial<OrganizationInvitation> = {},
  ): OrganizationInvitation => {
    const { organization = orgFixture(), ...rest } = extras;
    return {
      id: 123,
      token: 'token-123',
      email: 'user@example.com',
      expiresAt: future(),
      status: InvitationStatus.PENDING,
      organization,
      ...rest,
    } as OrganizationInvitation;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    roleAssignments.clear();
    mockQueryBuilder.getMany.mockReset();
    mockDomainService.getAllUsers.mockResolvedValue([]);
    mockQueryBuilder.getMany.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
        {
          provide: getRepositoryToken(JoinRequest),
          useValue: mockJoinRequestRepo,
        },
        {
          provide: getRepositoryToken(OrganizationInvitation),
          useValue: mockInvitationRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: DomainService, useValue: mockDomainService },
        { provide: OrganizationMailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = module.get(OrganizationService);
  });
  describe('create organization & slug normalization', () => {
    const baseDto = {
      name: 'Org Name',
      companyName: 'Test Company',
      companyId: '12345678',
      organizationAlias: 'test-alias',
      description: undefined,
      isPrivate: false,
    } as CreateOrganizationDto;

    it('creates organization with generated slug and assigns owner role', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockOrgRepo.create.mockImplementation((dto) => dto as Organization);
      mockOrgRepo.save.mockImplementation((dto: Organization) => ({
        ...dto,
        id: dto.id ?? 1,
      }));
      mockOrgRepo.findOneOrFail.mockResolvedValue(
        orgFixture({ slug: 'test-alias' }),
      );
      mockDomainService.create.mockResolvedValue(undefined as never);

      const result = await service.create('user-1', baseDto);

      expect(mockOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'test-alias', companyId: '12345678' }),
      );
      const [[savedOrg]] = mockOrgRepo.save.mock.calls as [[Organization]];
      expect(mockDomainService.create).toHaveBeenCalledWith(
        String(savedOrg.id),
        'Organization',
        'user-1',
      );
      expect(result.slug).toBe('test-alias');
    });

    it('appends numeric suffix when slug already exists', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { slug: 'test-alias' },
        { slug: 'test-alias-1' },
      ]);
      mockOrgRepo.create.mockImplementation((dto) => dto as Organization);
      mockOrgRepo.save.mockResolvedValue({ id: 2 });
      mockOrgRepo.findOneOrFail.mockResolvedValue(
        orgFixture({ slug: 'test-alias-2' }),
      );

      const result = await service.create('user-1', baseDto);

      expect(result.slug).toBe('test-alias-2');
    });

    it('normalizes diacritics, whitespace, and punctuation in alias', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockOrgRepo.create.mockImplementation((dto) => dto as Organization);
      mockOrgRepo.save.mockResolvedValue({ id: 3 });
      mockOrgRepo.findOneOrFail.mockResolvedValue(
        orgFixture({ slug: 'ceska-firma' }),
      );

      const result = await service.create('user-1', {
        ...baseDto,
        organizationAlias: '  Čéská   Firma!!!  ',
      });

      expect(result.slug).toBe('ceska-firma');
    });

    it('generateUniqueSlug preserves existing slug when excluding id', async () => {
      mockOrgRepo.findOne.mockResolvedValue(
        orgFixture({ id: 42, slug: 'custom-alias' }),
      );
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const slug = await service.generateUniqueSlug('Custom Alias', 42);

      expect(slug).toBe('custom-alias');
    });

    it('generateUniqueSlug fills numbering gaps', async () => {
      mockOrgRepo.findOne.mockResolvedValue(null);
      mockQueryBuilder.getMany.mockResolvedValue([
        { slug: 'm' },
        { slug: 'm-1' },
        { slug: 'm-6' },
      ]);

      const slug = await service.generateUniqueSlug('M');

      expect(slug).toBe('m-7');
    });

    it('trims companyId before saving', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockOrgRepo.create.mockImplementation((dto) => dto as Organization);
      mockOrgRepo.save.mockImplementation((dto: Organization) => ({
        ...dto,
        id: dto.id ?? 1,
      }));
      mockOrgRepo.findOneOrFail.mockResolvedValue(
        orgFixture({ slug: 'trimmed-alias', companyId: '12345678' }),
      );
      mockDomainService.create.mockResolvedValue(undefined as never);

      await service.create('user-1', {
        ...baseDto,
        companyId: ' 12345678 ',
        organizationAlias: 'trimmed-alias',
      });

      expect(mockOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: '12345678' }),
      );
    });

    it('propagates domain service errors', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockOrgRepo.create.mockImplementation((dto) => dto as Organization);
      mockOrgRepo.save.mockImplementation((dto: Organization) => ({
        ...dto,
        id: dto.id ?? 1,
      }));
      mockOrgRepo.findOneOrFail.mockResolvedValue(
        orgFixture({ slug: 'domain-error' }),
      );
      mockDomainService.create.mockRejectedValue(new Error('domain failed'));

      await expect(service.create('user-1', baseDto)).rejects.toThrow(
        'domain failed',
      );
    });
  });

  describe('update organization', () => {
    const updateDto = {
      name: 'Updated Org',
      description: ' Updated description ',
      organizationAlias: 'new-alias',
      companyId: '87654321',
      isPrivate: true,
    };

    it('updates alias and returns new slug', async () => {
      const existingOrg = orgFixture({
        organizationAlias: 'old-alias',
        slug: 'old-alias',
      });
      mockOrgRepo.findOneOrFail.mockResolvedValue(existingOrg);
      mockOrgRepo.save.mockImplementation((org: Organization) => ({
        ...org,
      }));
      setupRoleContext();
      const slugSpy = jest
        .spyOn(service, 'generateUniqueSlug')
        .mockResolvedValue('new-alias-1');
      const mapSpy = jest.spyOn(service as any, 'mapToDto').mockResolvedValue({
        id: existingOrg.id,
        slug: 'new-alias-1',
        organizationAlias: 'new-alias',
      } as any);

      const result = await service.update('user-1', existingOrg.id, updateDto);

      expect(slugSpy).toHaveBeenCalledWith('new-alias', existingOrg.id);
      expect(result.newSlug).toBe('new-alias-1');
      expect(mapSpy).toHaveBeenCalled();
      slugSpy.mockRestore();
      mapSpy.mockRestore();
    });

    it('does not generate slug when alias unchanged', async () => {
      const existingOrg = orgFixture({
        organizationAlias: 'alias',
        slug: 'alias',
      });
      mockOrgRepo.findOneOrFail.mockResolvedValue(existingOrg);
      mockOrgRepo.save.mockResolvedValue(existingOrg);
      setupRoleContext();
      const slugSpy = jest.spyOn(service, 'generateUniqueSlug');
      const mapSpy = jest
        .spyOn(service as any, 'mapToDto')
        .mockResolvedValue({ id: existingOrg.id, slug: 'alias' } as any);

      await service.update('user-1', existingOrg.id, {
        ...updateDto,
        organizationAlias: 'alias',
      });

      expect(slugSpy).not.toHaveBeenCalled();
      mapSpy.mockRestore();
      slugSpy.mockRestore();
    });

    it('throws when caller lacks permissions', async () => {
      const existingOrg = orgFixture();
      mockOrgRepo.findOneOrFail.mockResolvedValue(existingOrg);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        isAdmin: false,
      } as User);
      mockDomainService.getRole.mockResolvedValue('Viewer');

      await expect(
        service.update('user-1', existingOrg.id, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove & restore organization', () => {
    it('archives organization when caller is owner', async () => {
      const org = orgFixture();
      mockOrgRepo.findOneOrFail.mockResolvedValue(org);
      mockOrgRepo.save.mockResolvedValue(org);
      setupRoleContext();

      await service.remove('user-1', org.id);

      expect(mockOrgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false, modifiedBy: 'user-1' }),
      );
    });

    it('throws when non-owner tries to remove', async () => {
      mockOrgRepo.findOneOrFail.mockResolvedValue(orgFixture());
      setupRoleContext('Viewer', { userId: 'user-2', isAdmin: false });

      await expect(service.remove('user-2', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('restores organization when caller is admin', async () => {
      const org = orgFixture({ isActive: false });
      mockOrgRepo.findOneOrFail.mockResolvedValue(org);
      setupRoleContext('Viewer', { userId: 'admin', isAdmin: true });
      mockOrgRepo.save.mockResolvedValue(org);

      await service.restore('admin', org.id);

      expect(mockOrgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, modifiedBy: 'admin' }),
      );
    });

    it('throws when non-admin tries to restore', async () => {
      mockOrgRepo.findOneOrFail.mockResolvedValue(
        orgFixture({ isActive: false }),
      );
      setupRoleContext('Owner', { userId: 'user', isAdmin: false });

      await expect(service.restore('user', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove member', () => {
    it('removes a lower-role member and deletes role', async () => {
      const org = orgFixture();
      mockOrgRepo.findOneOrFail.mockResolvedValue(org);
      mockOrgRepo.createQueryBuilder.mockReturnValueOnce({
        relation: () => ({ of: () => ({ remove: jest.fn() }) }),
      } as any);
      setupRoleContext('Owner', { userId: 'owner' });
      mockDomainService.getRole.mockImplementation((id: string) => {
        if (id === 'owner') return 'Owner';
        if (id === 'member') return 'Viewer';
        return 'Viewer';
      });
      const deleteRoleSpy = jest.spyOn(mockDomainService, 'deleteRole');

      await service.removeMember('owner', org.id, 'member');

      expect(deleteRoleSpy).toHaveBeenCalledWith(String(org.id), 'member');
      deleteRoleSpy.mockRestore();
    });

    it('throws when removing higher-role member', async () => {
      setupRoleContext('Manager', { userId: 'manager' });
      roleAssignments.set('owner', { role: 'Owner', isAdmin: false });

      await expect(service.removeMember('manager', 1, 'owner')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ensures at least one owner remains when removing owner', async () => {
      setupRoleContext('Owner', { userId: 'owner' });
      mockDomainService.getRole.mockImplementation((id: string) => {
        if (id === 'owner' || id === 'owner-2') return 'Owner';
        return 'Viewer';
      });
      mockDomainService.getAllUsers.mockResolvedValue([
        { id: 'owner', role: 'Owner' },
        { id: 'owner-2', role: 'Owner' },
      ] as any);
      mockOrgRepo.createQueryBuilder.mockReturnValueOnce({
        relation: () => ({ of: () => ({ remove: jest.fn() }) }),
      } as any);
      const ensureSpy = jest.spyOn(service as any, 'ensureAtLeastOneOwnerLeft');

      await service.removeMember('owner', 1, 'owner-2');

      expect(ensureSpy).toHaveBeenCalledWith(1, 'owner-2');
      ensureSpy.mockRestore();
    });
  });

  describe('sendInvitations', () => {
    it('sends invitations for new emails', async () => {
      const organization = orgFixture();
      mockOrgRepo.findOne.mockResolvedValue(organization);
      mockOrgRepo.findOneOrFail.mockResolvedValue(organization);
      mockInvitationRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue(null);
      mockJoinRequestRepo.findOne.mockResolvedValue(null);
      mockDomainService.getRole.mockResolvedValue('Owner');
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const result = await service.sendInvitations('creator', 1, {
        emails: 'user@example.com',
      });

      expect(result.sent).toEqual(['user@example.com']);
      expect(mockInvitationRepo.save).toHaveBeenCalled();
      expect(mockMailService.sendInvitationEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Test Org',
        expect.stringContaining('invitations/token-123'),
      );
    });

    it('throws when no valid emails', async () => {
      const organization = orgFixture();
      mockOrgRepo.findOneOrFail.mockResolvedValue(organization);
      mockUserRepo.findOne.mockResolvedValue({ id: 'creator' } as User);
      mockDomainService.getRole.mockResolvedValue('Owner');

      const organizationId = organization.id;
      await expect(
        service.sendInvitations('creator', organizationId, {
          emails: '  ,  ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips existing invitations', async () => {
      const organization = orgFixture();
      mockOrgRepo.findOne.mockResolvedValue(organization);
      mockOrgRepo.findOneOrFail.mockResolvedValue(organization);
      mockInvitationRepo.findOne.mockResolvedValue(invitationFixture());
      mockUserRepo.findOne.mockResolvedValue({ id: 'creator' } as User);
      mockDomainService.getRole.mockResolvedValue('Owner');

      const organizationId = organization.id;
      const result = await service.sendInvitations('creator', organizationId, {
        emails: 'user@example.com',
      });

      expect(result.sent).toEqual([]);
      expect(result.skipped[0]?.reason).toBe('Invitation already sent');
    });

    it('skips existing members', async () => {
      const organization = orgFixture({
        members: [{ id: 'member-1' } as User],
      });
      mockOrgRepo.findOne.mockResolvedValue(organization);
      mockOrgRepo.findOneOrFail.mockResolvedValue(organization);
      mockInvitationRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: 'creator',
        isAdmin: false,
      } as User);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'member-1',
        email: 'member@example.com',
      } as User);
      mockDomainService.getRole.mockResolvedValue('Owner');

      const organizationId = organization.id;
      const result = await service.sendInvitations('creator', organizationId, {
        emails: 'member@example.com',
      });

      expect(result.sent).toEqual([]);
      expect(result.skipped[0]?.reason).toBe('User is already a member');
    });

    it('skips pending join request users', async () => {
      const organization = orgFixture();
      mockOrgRepo.findOne.mockResolvedValue(organization);
      mockOrgRepo.findOneOrFail.mockResolvedValue(organization);
      mockInvitationRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: 'creator',
        isAdmin: false,
      } as User);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'pending@example.com',
      } as User);
      mockJoinRequestRepo.findOne.mockResolvedValue({
        status: JoinRequestStatus.PENDING,
      } as JoinRequest);
      mockDomainService.getRole.mockResolvedValue('Owner');

      const organizationId = organization.id;
      const result = await service.sendInvitations('creator', organizationId, {
        emails: 'pending@example.com',
      });

      expect(result.sent).toEqual([]);
      expect(result.skipped[0]?.reason).toBe(
        'User already has a pending join request',
      );
    });

    it('throws when caller lacks permission', async () => {
      const organization = orgFixture();
      mockOrgRepo.findOneOrFail.mockResolvedValue(organization);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'creator',
        isAdmin: false,
      } as User);
      mockDomainService.getRole.mockResolvedValue('Viewer');

      await expect(
        service.sendInvitations('creator', organization.id, {
          emails: 'user@example.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('propagates not found when org missing', async () => {
      mockOrgRepo.findOneOrFail.mockRejectedValue(new NotFoundException());

      await expect(
        service.sendInvitations('creator', 999, { emails: 'user@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reminder scheduling & cron', () => {
    it('registers cron job with configured expression on module init', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ORG_REMINDER_CRON') return '0 12 * * *';
        if (key === 'ORG_REMINDER_DAYS') return '5';
        return undefined;
      });
      const jobMap = new Map<string, CronJob>();
      mockSchedulerRegistry.addCronJob.mockImplementation(
        (name: string, job: CronJob) => {
          jobMap.set(name, job);
        },
      );

      service.onModuleInit();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalled();
      const job = jobMap.get('organizationReminders');
      expect(job).toBeTruthy();
      const jobMock = job as unknown as { start: jest.Mock };
      expect(jobMock.start).toHaveBeenCalledTimes(1);
    });

    it('falls back to defaults when env missing', () => {
      mockConfigService.get.mockImplementation(() => undefined);
      mockSchedulerRegistry.addCronJob.mockImplementation(() => undefined);
      const logSpy = jest.spyOn(service['logger'], 'log');

      service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling reminder job'),
      );
      logSpy.mockRestore();
    });

    it('sends grouped reminder emails per recipient', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ORG_REMINDER_DAYS') return '5';
        if (key === 'FRONTEND_URL') return 'https://front';
        return undefined;
      });
      const requestAge = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const jrEntities: JoinRequest[] = [
        {
          id: 1,
          status: JoinRequestStatus.PENDING,
          message: 'First request',
          organization: orgFixture({
            id: 1,
            name: 'OrgOne',
            slug: 'org-one',
          }),
          user: {
            id: 'requester-1',
            firstName: 'First',
            lastName: 'Requester',
          } as User,
          createdAt: requestAge,
          modifiedAt: requestAge,
          modifiedBy: 'owner',
        },
        {
          id: 2,
          status: JoinRequestStatus.PENDING,
          message: '',
          organization: orgFixture({
            id: 2,
            name: 'OrgTwo',
            slug: 'org-two',
          }),
          user: {
            id: 'requester-2',
            firstName: 'Second',
            lastName: 'Requester',
          } as User,
          createdAt: requestAge,
          modifiedAt: requestAge,
          modifiedBy: 'owner',
        },
      ];
      mockJoinRequestRepo.find.mockResolvedValue(jrEntities);
      mockDomainService.getAllUsers.mockImplementation(
        (orgId: string): RoleUser[] => {
          if (orgId === '1')
            return [
              { id: 'owner-1', role: 'Owner' },
              { id: 'manager-1', role: 'Manager' },
            ];
          if (orgId === '2')
            return [
              { id: 'owner-1', role: 'Owner' },
              { id: 'viewer-1', role: 'Viewer' },
            ];
          return [];
        },
      );
      mockUserRepo.findOne.mockImplementation(
        ({ where }: { where?: { id?: string } }) => {
          const id = where?.id;
          if (id === 'owner-1')
            return {
              id,
              email: 'owner@example.com',
              firstName: 'Owner',
              lastName: 'One',
            } as User;
          if (id === 'manager-1')
            return {
              id,
              email: 'manager@example.com',
              firstName: 'Manager',
              lastName: 'One',
            } as User;
          if (id === 'viewer-1')
            return {
              id,
              email: 'viewer@example.com',
              firstName: 'Viewer',
              lastName: 'One',
            } as User;
          return null;
        },
      );

      await service.sendPendingJoinRequestReminders();

      const firstFindCall = mockJoinRequestRepo.find.mock.calls[0] as
        | [{ where: { status: JoinRequestStatus } }]
        | undefined;
      const findArgs = firstFindCall?.[0];
      expect(findArgs?.where.status).toBe(JoinRequestStatus.PENDING);
      expect(
        mockMailService.sendJoinRequestReminderEmail,
      ).toHaveBeenCalledTimes(2);
      expect(mockMailService.sendJoinRequestReminderEmail).toHaveBeenCalledWith(
        'owner@example.com',
        'Owner',
        expect.arrayContaining([
          expect.objectContaining({ orgName: 'OrgOne' }),
          expect.objectContaining({ orgName: 'OrgTwo' }),
        ]),
      );
      expect(mockMailService.sendJoinRequestReminderEmail).toHaveBeenCalledWith(
        'manager@example.com',
        'Manager',
        expect.arrayContaining([
          expect.objectContaining({ orgName: 'OrgOne' }),
        ]),
      );
    });

    it('does nothing when no pending requests meet threshold', async () => {
      mockJoinRequestRepo.find.mockResolvedValue([]);

      await service.sendPendingJoinRequestReminders();

      expect(
        mockMailService.sendJoinRequestReminderEmail,
      ).not.toHaveBeenCalled();
    });

    it('logs an error when reminder execution fails', async () => {
      const jobMap = new Map<string, CronJob>();
      mockSchedulerRegistry.addCronJob.mockImplementation(
        (name: string, job: CronJob) => {
          jobMap.set(name, job);
        },
      );
      jest
        .spyOn(service, 'sendPendingJoinRequestReminders')
        .mockRejectedValue(new Error('boom'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      service.onModuleInit();
      const job = jobMap.get('organizationReminders');
      if (job) {
        await (
          job as unknown as { onTick: () => Promise<void> | void }
        ).onTick();
      }

      expect(errorSpy).toHaveBeenCalledWith(
        'Error running reminder job',
        expect.any(Error),
      );
      errorSpy.mockRestore();
    });
  });

  describe('getInvitationSummary', () => {
    it('returns metadata for valid invitation', async () => {
      const invite = invitationFixture({
        organization: orgFixture({ slug: 'org' }),
      });
      mockInvitationRepo.findOne.mockResolvedValue(invite);
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1' } as User);
      mockOrgRepo.findOne.mockResolvedValue(
        orgFixture({ id: invite.organization.id }),
      );

      const emailValue = invite.email;
      const summary = await service.getInvitationSummary(
        invite.token,
        emailValue,
      );

      expect(summary.organization.slug).toBe('org');
      expect(summary.alreadyMember).toBe(false);
    });

    it('marks invitation as expired when past expiration', async () => {
      const invite = invitationFixture({ expiresAt: past() });
      mockInvitationRepo.findOne.mockResolvedValue(invite);
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1' } as User);

      const emailValue = invite.email;
      const summary = await service.getInvitationSummary(
        invite.token,
        emailValue,
      );

      expect(summary.isExpired).toBe(true);
    });

    it('marks alreadyMember when user in org', async () => {
      const invite = invitationFixture();
      mockInvitationRepo.findOne.mockResolvedValue(invite);
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-1' } as User);
      mockOrgRepo.findOne.mockResolvedValue(
        orgFixture({
          id: invite.organization.id,
          members: [{ id: 'user-1' } as User],
        }),
      );

      const emailValue = invite.email;
      const summary = await service.getInvitationSummary(
        invite.token,
        emailValue,
      );

      expect(summary.alreadyMember).toBe(true);
    });
  });

  describe('findInvitationForUser', () => {
    it('returns pending invitation token', async () => {
      const invite = invitationFixture();
      mockOrgRepo.findOne.mockResolvedValue(
        orgFixture({ id: invite.organization.id }),
      );
      mockInvitationRepo.findOne.mockResolvedValue(invite);
      mockUserRepo.findOne.mockResolvedValue({ id: 'creator' } as User);

      const emailValue = invite.email;
      const orgIdValue = invite.organization.id;
      const result = await service.findInvitationForUser(
        'creator',
        emailValue,
        orgIdValue,
      );

      expect(result.token).toBe(invite.token);
    });

    it('throws when no invitation present', async () => {
      mockOrgRepo.findOne.mockResolvedValue(orgFixture());
      mockInvitationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findInvitationForUser('creator', 'none@example.com', 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    const setup = (overrides: Partial<OrganizationInvitation> = {}) => {
      const invite = invitationFixture(overrides);
      mockInvitationRepo.findOne.mockResolvedValue(invite);
      mockUserRepo.findOne.mockImplementation(
        (params: { where: Record<string, unknown> }) => {
          const where = params.where;
          if ('email' in where) {
            const emailValue = where.email as string;
            return { id: 'user-1', email: emailValue } as User;
          }
          if ('id' in where) {
            const idValue = where.id as string;
            return { id: idValue } as User;
          }
          return null;
        },
      );
      mockOrgRepo.findOne.mockResolvedValue(
        orgFixture({
          id: invite.organization.id,
          members: [],
          name: invite.organization.name,
          slug: invite.organization.slug,
        }),
      );
      return invite;
    };

    it('accepts invitation and joins user', async () => {
      const invite = setup({ organization: orgFixture({ slug: 'org' }) });
      const emailValue = invite.email;
      const joinSpy = jest
        .spyOn(service, 'join')
        .mockResolvedValue(undefined as never);

      const result = await service.acceptInvitation(invite.token, emailValue);

      expect(joinSpy).toHaveBeenCalledWith('user-1', invite.organization.id);
      expect(mockInvitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
      );
      expect(result.slug).toBe('org');
      joinSpy.mockRestore();
    });

    it('throws when invite expired', async () => {
      setup({ expiresAt: past() });

      await expect(
        service.acceptInvitation('token', 'user@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns already member message on duplicate join', async () => {
      const invite = setup();
      const emailValue = invite.email;
      jest
        .spyOn(service, 'join')
        .mockRejectedValue(new BadRequestException('already a member'));

      const result = await service.acceptInvitation(invite.token, emailValue);

      expect(result.message).toMatch(/already a member/);
    });

    it('handles database constraint errors gracefully', async () => {
      const invite = setup();
      const emailValue = invite.email;
      jest.spyOn(service, 'join').mockRejectedValue({ code: '23505' });

      const result = await service.acceptInvitation(invite.token, emailValue);

      expect(result.message).toMatch(/already a member/);
    });
  });

  describe('rejectInvitation', () => {
    const setup = (overrides: Partial<OrganizationInvitation> = {}) => {
      const invite = invitationFixture(overrides);
      mockInvitationRepo.findOne.mockResolvedValue(invite);
      mockUserRepo.findOne.mockImplementation(
        (params: { where: Record<string, unknown> }) => {
          const where = params.where;
          if ('email' in where) {
            const emailValue = where.email as string;
            return { id: 'user-1', email: emailValue } as User;
          }
          return null;
        },
      );
      return invite;
    };

    it('marks invitation rejected', async () => {
      const invite = setup();
      const emailValue = invite.email;

      const result = await service.rejectInvitation(invite.token, emailValue);

      expect(result.message).toContain('Invitation rejected');
      expect(mockInvitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.REJECTED }),
      );
    });

    it('returns message when already accepted', async () => {
      const invite = setup({ status: InvitationStatus.ACCEPTED });
      const emailValue = invite.email;

      const result = await service.rejectInvitation(invite.token, emailValue);

      expect(result.message).toMatch(/already joined/);
      expect(mockInvitationRepo.save).not.toHaveBeenCalled();
    });

    it('throws for expired invites', async () => {
      setup({ expiresAt: past() });

      await expect(
        service.rejectInvitation('token', 'user@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('invitation listings', () => {
    it('returns pending invites', async () => {
      const org = orgFixture();
      mockOrgRepo.findOne.mockResolvedValue(org);
      mockUserRepo.findOne.mockResolvedValue({ id: 'creator' } as User);
      mockDomainService.getRole.mockResolvedValue('Owner');
      const pending = [
        invitationFixture(),
        invitationFixture({ token: 'two' }),
      ];
      mockInvitationRepo.find.mockResolvedValue(pending);

      const result = await service.findPendingInvitations('creator', org.id);

      expect(result).toEqual(pending);
    });

    it('returns full history', async () => {
      const org = orgFixture();
      mockOrgRepo.findOne.mockResolvedValue(org);
      mockUserRepo.findOne.mockResolvedValue({ id: 'creator' } as User);
      mockDomainService.getRole.mockResolvedValue('Owner');
      const history = [
        invitationFixture(),
        invitationFixture({
          token: 'accepted',
          status: InvitationStatus.ACCEPTED,
        }),
      ];
      mockInvitationRepo.find.mockResolvedValue(history);

      const result = await service.findAllInvitations('creator', org.id);

      expect(result).toEqual(history);
    });
  });

  describe('mapToDto', () => {
    const invokeMapToDto = async (
      org: Organization,
      members: User[],
      currentUserId?: string,
    ) => {
      const mapper = service as unknown as {
        mapToDto: (
          organization: Organization,
          list: User[],
          userId?: string,
        ) => Promise<OrganizationDto>;
      };
      return mapper.mapToDto(org, members, currentUserId);
    };

    it('maps base organization fields without current user', async () => {
      const org = orgFixture({
        creator: {
          id: 'creator',
          firstName: 'Alice',
          lastName: 'Owner',
        } as User,
      });
      const members = [
        { id: 'm1', firstName: 'Bob', lastName: 'Member' } as User,
        { id: 'm2', firstName: 'Cara', lastName: 'Member' } as User,
      ];

      const dto = await invokeMapToDto(org, members);

      expect(dto).toMatchObject({
        id: org.id,
        creatorName: 'Alice Owner',
        memberCount: 2,
        members: [
          { id: 'm1', firstName: 'Bob', lastName: 'Member' },
          { id: 'm2', firstName: 'Cara', lastName: 'Member' },
        ],
        isMember: false,
        isOwner: false,
        currentUserRole: null,
        isAdmin: false,
      });
    });

    it('reflects membership and owner role for current user', async () => {
      const org = orgFixture({ id: 5 });
      const members = [
        { id: 'user-1', firstName: 'User', lastName: 'One' } as User,
      ];
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        isAdmin: false,
      } as User);
      mockDomainService.getRole.mockResolvedValue('Owner');

      const dto = await invokeMapToDto(org, members, 'user-1');

      expect(dto.isMember).toBe(true);
      expect(dto.isOwner).toBe(true);
      expect(dto.currentUserRole).toBe('Owner');
      expect(dto.currentUserId).toBe('user-1');
      expect(dto.isAdmin).toBe(false);
    });

    it('retains organization role while flagging platform admin', async () => {
      const org = orgFixture({ id: 6 });
      const members = [
        { id: 'user-2', firstName: 'User', lastName: 'Two' } as User,
      ];
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-2',
        isAdmin: true,
      } as User);
      mockDomainService.getRole.mockResolvedValue('Viewer');

      const dto = await invokeMapToDto(org, members, 'user-2');

      expect(dto.isAdmin).toBe(true);
      expect(dto.currentUserRole).toBe('Viewer');
    });
  });
});
