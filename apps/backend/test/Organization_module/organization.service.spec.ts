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
import { EmailService } from '../../src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CreateOrganizationDto } from '../../src/organization/dto/create-organization.dto';

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
};

const mockJoinRequestRepo = {
  findOne: jest.fn(),
};

const mockDomainService = {
  getAllUsers: jest.fn(),
  getRole: jest.fn(),
  create: jest.fn(),
};

const mockEmailService = {
  sendEmail: jest.fn(),
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
  getMany: jest.fn(),
};

mockOrgRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

describe('OrganizationService - Creation & Invitations', () => {
  let service: OrganizationService;

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
    mockQueryBuilder.getMany.mockReset();
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
        { provide: EmailService, useValue: mockEmailService },
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
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
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
});
