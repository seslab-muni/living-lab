import { OrganizationController } from '../../src/organization/organization.controller';
import { OrganizationService } from '../../src/organization/organization.service';
import type { JwtPayload } from '../../src/auth/types/jwt-payload.interface';
import { CreateOrganizationDto } from '../../src/organization/dto/create-organization.dto';
import { UpdateOrganizationDto } from '../../src/organization/dto/update-organization.dto';
import { OrganizationDto } from '../../src/organization/dto/organization.dto';

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

    it('updates organization when numeric id provided', async () => {
      const updated = organizationResponse({ name: 'Updated Name' });
      const updateMock = getServiceMock('update');
      updateMock.mockResolvedValue(updated);

      const result = await controller.update(user, '25', updateDto);

      const slugLookupMock = getServiceMock('findOneBySlugForUser');
      expect(slugLookupMock).not.toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalledWith('user-1', 25, updateDto);
      expect(result).toBe(updated);
    });

    it('resolves slug before updating organization', async () => {
      const slugDto = organizationResponse({ id: 77, slug: 'org-slug' });
      const slugLookupMock = getServiceMock('findOneBySlugForUser');
      slugLookupMock.mockResolvedValue(slugDto);
      const updated = organizationResponse({ id: 77, name: 'Slug Updated' });
      const updateMock = getServiceMock('update');
      updateMock.mockResolvedValue(updated);

      const result = await controller.update(user, 'org-slug', updateDto);

      expect(slugLookupMock).toHaveBeenCalledWith('user-1', 'org-slug');
      expect(updateMock).toHaveBeenCalledWith('user-1', 77, updateDto);
      expect(result).toBe(updated);
    });
  });

  describe('invitations', () => {
    const invitationDto = { emails: 'user@example.com' };

    it('sends invitations using numeric id', async () => {
      const resultPayload = { sent: ['user@example.com'], skipped: [] };
      const sendMock = getServiceMock('sendInvitations');
      sendMock.mockResolvedValue(resultPayload);

      const result = await controller.sendInvitations(
        user,
        '42',
        invitationDto,
      );

      expect(getServiceMock('findOneBySlugForUser')).not.toHaveBeenCalled();
      expect(sendMock).toHaveBeenCalledWith('user-1', 42, invitationDto);
      expect(result).toBe(resultPayload);
    });

    it('resolves slug before sending invitations', async () => {
      const slugOrg = organizationResponse({ id: 55, slug: 'slug-org' });
      const slugLookup = getServiceMock('findOneBySlugForUser');
      slugLookup.mockResolvedValue(slugOrg);
      const sendMock = getServiceMock('sendInvitations');
      sendMock.mockResolvedValue({ sent: [], skipped: [] });

      await controller.sendInvitations(user, 'slug-org', invitationDto);

      expect(slugLookup).toHaveBeenCalledWith('user-1', 'slug-org');
      expect(sendMock).toHaveBeenCalledWith('user-1', 55, invitationDto);
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

    it('lists invitation history for slug', async () => {
      const slugOrg = organizationResponse({ id: 88, slug: 'org-slug' });
      const slugLookup = getServiceMock('findOneBySlugForUser');
      slugLookup.mockResolvedValue(slugOrg);
      const historyMock = getServiceMock('findAllInvitations');
      historyMock.mockResolvedValue([]);

      await controller.listInvitationHistory(user, 'org-slug');

      expect(slugLookup).toHaveBeenCalledWith('user-1', 'org-slug');
      expect(historyMock).toHaveBeenCalledWith('user-1', 88);
    });

    it('lists invitation history for numeric id', async () => {
      const historyMock = getServiceMock('findAllInvitations');
      historyMock.mockResolvedValue([]);

      await controller.listInvitationHistory(user, '99');

      expect(getServiceMock('findOneBySlugForUser')).not.toHaveBeenCalled();
      expect(historyMock).toHaveBeenCalledWith('user-1', 99);
    });
  });
});
