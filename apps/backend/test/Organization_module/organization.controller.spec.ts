import { OrganizationController } from '../../src/organization/organization.controller';
import { OrganizationService } from '../../src/organization/organization.service';
import type { JwtPayload } from '../../src/auth/types/jwt-payload.interface';
import { CreateOrganizationDto } from '../../src/organization/dto/create-organization.dto';
import { UpdateOrganizationDto } from '../../src/organization/dto/update-organization.dto';
import { OrganizationDto } from '../../src/organization/dto/organization.dto';
import type { Request } from 'express';

const mockOrganizationService: jest.Mocked<OrganizationService> = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  findOneBySlugForUser: jest.fn(),
  findOneForUser: jest.fn(),
  findAllForCreator: jest.fn(),
  findDuplicates: jest.fn(),
  findOneBySlug: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  createJoinRequest: jest.fn(),
  findPendingRequestsForOrg: jest.fn(),
  searchAndSortOrganizations: jest.fn(),
  generateUniqueSlug: jest.fn(),
  update: jest.fn(),
  findJoinRequestByIdForOwner: jest.fn(),
  findPendingInvitations: jest.fn(),
  getInvitationSummary: jest.fn(),
  findInvitationForUser: jest.fn(),
  findAllInvitations: jest.fn(),
  sendInvitations: jest.fn(),
  revokeInvitation: jest.fn(),
  acceptInvitation: jest.fn(),
  rejectInvitation: jest.fn(),
  handleJoinRequest: jest.fn(),
  restore: jest.fn(),
  remove: jest.fn(),
  removeMember: jest.fn(),
  findInvitationByToken: jest.fn(),
  sendPendingJoinRequestReminders: jest.fn(),
  findOneBySlugForUserOrFail: jest.fn(),
  findOrganizationsForAdminView: jest.fn(),
  registerReminderCron: jest.fn(),
  listInvitationsWithStatus: jest.fn(),
} as unknown as jest.Mocked<OrganizationService>;

const organizationResponse = (overrides: Partial<OrganizationDto> = {}) =>
  ({
    id: 10,
    name: 'Test Org',
    slug: 'test-org',
    description: 'Desc',
    creatorId: 'user-creator',
    creatorName: 'Creator User',
    companyId: '12345678',
    organizationAlias: 'test-org',
    isPrivate: false,
    isActive: true,
    createdAt: new Date(),
    lastEdit: new Date(),
    modifiedBy: 'user-creator',
    memberCount: 1,
    isMember: true,
    hasPendingRequest: false,
    isOwner: true,
    members: [],
    currentUserRole: 'Owner',
    isAdmin: false,
    currentUserId: 'user-creator',
    ...overrides,
  }) as OrganizationDto;

const getServiceMock = <K extends keyof OrganizationService>(key: K) =>
  mockOrganizationService[key] as jest.Mock;

describe('OrganizationController - creation & update', () => {
  let controller: OrganizationController;

  const user: JwtPayload = {
    id: 'user-1',
    email: 'user@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OrganizationController(mockOrganizationService);
  });

  describe('create', () => {
    const dto: CreateOrganizationDto = {
      name: 'New Org',
      companyId: '87654321',
      organizationAlias: 'new-org',
      description: 'New org description',
    };

    it('delegates to service with authenticated user id', async () => {
      const expected = organizationResponse({ name: 'New Org' });
      const createMock = getServiceMock('create');
      createMock.mockResolvedValue(expected);

      const result = await controller.create(user, dto);

      expect(createMock).toHaveBeenCalledWith('user-1', dto);
      expect(result).toBe(expected);
    });

    it('propagates service errors', async () => {
      const createMock = getServiceMock('create');
      createMock.mockRejectedValue(new Error('validation failed'));

      await expect(controller.create(user, dto)).rejects.toThrow(
        'validation failed',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateOrganizationDto = {
      name: 'Updated Name',
      description: 'Updated description',
      organizationAlias: 'updated-alias',
      isPrivate: true,
      companyId: '11112222',
    };

    it('updates organization', async () => {
      const updated = organizationResponse({ name: 'Updated Name' });
      const updateMock = getServiceMock('update');
      updateMock.mockResolvedValue(updated);

      const result = await controller.update(user, 25, updateDto);

      expect(updateMock).toHaveBeenCalledWith('user-1', 25, updateDto);
      expect(result).toBe(updated);
    });
  });

  describe('invitations', () => {
    const invitationDto = { emails: 'user@example.com' };

    it('sends invitations', async () => {
      const resultPayload = { sent: ['user@example.com'], skipped: [] };
      const sendMock = getServiceMock('sendInvitations');
      sendMock.mockResolvedValue(resultPayload);

      const result = await controller.sendInvitations(user, 42, invitationDto);

      expect(sendMock).toHaveBeenCalledWith('user-1', 42, invitationDto);
      expect(result).toBe(resultPayload);
    });

    it('throws when authenticated user lacks email for token endpoints', async () => {
      await expect(
        controller.acceptInvitation({ id: 'user-2' } as JwtPayload, {
          token: 'abc',
        }),
      ).rejects.toThrow('Authenticated user has no email in token');
    });

    it('accepts invitation with JWT email', async () => {
      const acceptMock = getServiceMock('acceptInvitation');
      acceptMock.mockResolvedValue({ slug: 'org' });

      const result = await controller.acceptInvitation(user, { token: 'abc' });

      expect(acceptMock).toHaveBeenCalledWith('abc', 'user@example.com');
      expect(result).toEqual({ slug: 'org' });
    });

    it('rejects invitation with JWT email', async () => {
      const rejectMock = getServiceMock('rejectInvitation');
      rejectMock.mockResolvedValue({ message: 'ok' });

      const result = await controller.rejectInvitation(user, { token: 'abc' });

      expect(rejectMock).toHaveBeenCalledWith('abc', 'user@example.com');
      expect(result).toEqual({ message: 'ok' });
    });

    it('lists invitation history', async () => {
      const historyMock = getServiceMock('findAllInvitations');
      historyMock.mockResolvedValue([]);

      await controller.listInvitationHistory(user, 99);

      expect(historyMock).toHaveBeenCalledWith('user-1', 99);
    });

    it('lists pending invitations', async () => {
      const pendingMock = getServiceMock('findPendingInvitations');
      pendingMock.mockResolvedValue([]);

      await controller.listInvitations(user, 93);

      expect(pendingMock).toHaveBeenCalledWith('user-1', 93);
    });

    it('revokes invitation', async () => {
      const revokeMock = getServiceMock('revokeInvitation');
      revokeMock.mockResolvedValue(undefined);

      await controller.revokeInvitation(user, '123');

      expect(revokeMock).toHaveBeenCalledWith('user-1', 123);
    });

    it('throws when my-invitation uses numeric id without email', async () => {
      await expect(
        controller.getMyInvitation({ id: 'user-2' } as JwtPayload, 15),
      ).rejects.toThrow('Authenticated user has no email in token');
    });

    it('fetches my invitation', async () => {
      const findInviteMock = getServiceMock('findInvitationForUser');
      findInviteMock.mockResolvedValue({ token: '123' });

      const result = await controller.getMyInvitation(user, 15);

      expect(findInviteMock).toHaveBeenCalledWith(
        'user-1',
        'user@example.com',
        15,
      );
      expect(result).toEqual({ token: '123' });
    });
  });

  describe('join requests', () => {
    const joinDto = { message: 'please join' };

    it('creates join request', async () => {
      const createJoinMock = getServiceMock('createJoinRequest');
      createJoinMock.mockResolvedValue({ id: 1 });

      await controller.joinRequest(user, 12, joinDto);

      expect(createJoinMock).toHaveBeenCalledWith('user-1', 12, joinDto);
    });

    it('lists pending join requests', async () => {
      const listMock = getServiceMock('findPendingRequestsForOrg');
      listMock.mockResolvedValue([]);

      await controller.listRequests(user, 44);

      expect(listMock).toHaveBeenCalledWith('user-1', 44);
    });

    it('fetches join request detail', async () => {
      const detailMock = getServiceMock('findJoinRequestByIdForOwner');
      detailMock.mockResolvedValue({
        id: 5,
        message: 'msg',
        status: 'PENDING',
        createdAt: new Date(),
        user: { id: 'user-2', firstName: 'A', lastName: 'B' },
      });

      await controller.getRequest(user, '5');

      expect(detailMock).toHaveBeenCalledWith('user-1', 5);
    });

    it('approves join request', async () => {
      const handleMock = getServiceMock('handleJoinRequest');
      handleMock.mockResolvedValue(undefined);

      await controller.approve(user, '7');

      expect(handleMock).toHaveBeenCalledWith('user-1', 7, true);
    });

    it('rejects join request', async () => {
      const handleMock = getServiceMock('handleJoinRequest');
      handleMock.mockResolvedValue(undefined);

      await controller.reject(user, '8');

      expect(handleMock).toHaveBeenCalledWith('user-1', 8, false);
    });
  });

  describe('membership & lifecycle', () => {
    it('joins organization', async () => {
      const joinMock = getServiceMock('join');
      joinMock.mockResolvedValue(undefined);

      await controller.join(user, 22);

      expect(joinMock).toHaveBeenCalledWith('user-1', 22);
    });

    it('leaves organization', async () => {
      const leaveMock = getServiceMock('leave');
      leaveMock.mockResolvedValue(undefined);

      await controller.leave(user, 30);

      expect(leaveMock).toHaveBeenCalledWith('user-1', 30);
    });

    it('restores organization', async () => {
      const restoreMock = getServiceMock('restore');
      restoreMock.mockResolvedValue(undefined);

      await controller.restore(user, 41);

      expect(restoreMock).toHaveBeenCalledWith('user-1', 41);
    });

    it('removes organization', async () => {
      const removeMock = getServiceMock('remove');
      removeMock.mockResolvedValue(undefined);

      await controller.remove(user, 55);

      expect(removeMock).toHaveBeenCalledWith('user-1', 55);
    });

    it('removes member', async () => {
      const removeMemberMock = getServiceMock('removeMember');
      removeMemberMock.mockResolvedValue(undefined);

      await controller.removeMember(user, 81, 'member-1');

      expect(removeMemberMock).toHaveBeenCalledWith('user-1', 81, 'member-1');
    });
  });

  describe('lookup endpoints', () => {
    it('finds organization', async () => {
      const orgDto = organizationResponse({ id: 5 });
      const findMock = getServiceMock('findOneForUser');
      findMock.mockResolvedValue(orgDto);

      const result = await controller.findOne(user, 5);

      expect(findMock).toHaveBeenCalledWith('user-1', 5);
      expect(result).toBe(orgDto);
    });

    it('searches organizations with filters and pagination', async () => {
      const searchMock = getServiceMock('searchAndSortOrganizations');
      const expectedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      searchMock.mockResolvedValue(expectedResult);

      const result = await controller.searchOrganizations(
        user,
        'test',
        'asc',
        'true',
        2,
        20,
        'true',
      );

      expect(searchMock).toHaveBeenCalledWith(
        'test',
        'asc',
        'user-1',
        true,
        2,
        20,
        true,
      );
      expect(result).toBe(expectedResult);
    });

    it('fetches slug preview requiring alias', async () => {
      const slugMock = getServiceMock('generateUniqueSlug');
      slugMock.mockResolvedValue('slug-preview');

      const result = await controller.getSlugPreview('  alias  ');

      expect(slugMock).toHaveBeenCalledWith('alias', undefined);
      expect(result).toEqual({ alias: '  alias  ', slug: 'slug-preview' });
    });

    it('throws when slug preview alias missing', async () => {
      await expect(controller.getSlugPreview('')).rejects.toThrow(
        'Alias is required',
      );
    });

    it('fetches invitation summary for token', async () => {
      const summaryMock = getServiceMock('getInvitationSummary');
      summaryMock.mockResolvedValue({ organization: { slug: 'org' } });

      const result = await controller.getInvitation(user, 'token123');

      expect(summaryMock).toHaveBeenCalledWith('token123', 'user@example.com');
      expect(result).toEqual({ organization: { slug: 'org' } });
    });

    it('finds duplicates with query params', async () => {
      const dupMock = getServiceMock('findDuplicates');
      dupMock.mockResolvedValue([]);
      const req = { user } as unknown as Request;

      await controller.findDuplicates(req, 'Org', 123, 'alias', 2);

      expect(dupMock).toHaveBeenCalledWith('user-1', 'Org', 123, 'alias', 2);
    });

    it('lists organizations excluding inactive by default', async () => {
      const listMock = getServiceMock('findAllForUser');
      listMock.mockResolvedValue([]);

      await controller.findAll(user);

      expect(listMock).toHaveBeenCalledWith('user-1', false);
    });

    it('lists organizations including inactive when requested', async () => {
      const listMock = getServiceMock('findAllForUser');
      listMock.mockResolvedValue([]);

      await controller.findAll(user, 'true');

      expect(listMock).toHaveBeenCalledWith('user-1', true);
    });
  });
});
