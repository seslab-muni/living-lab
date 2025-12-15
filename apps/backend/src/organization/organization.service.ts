import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationDto } from './dto/organization.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JoinRequest, JoinRequestStatus } from './entities/join-request.entity';
import { User } from 'src/user/entities/user.entity';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { JoinRequestDto } from './dto/join-request.dto';
import { OrganizationMailService } from './organization-mail.service';
import { ConfigService } from '@nestjs/config';
import { LessThan } from 'typeorm';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InvitationStatus,
  OrganizationInvitation,
} from './entities/organization-invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { MoreThan } from 'typeorm';
import { DomainService } from '../domain-role/domain.service';

type InvitationSummaryResponse = {
  organization: { name: string; slug: string };
  status: InvitationStatus;
  expiresAt: Date;
  isExpired: boolean;
  alreadyMember: boolean;
};

type MyInvitationResponse = {
  token: string;
  status: InvitationStatus;
  organization: { name: string; slug: string };
};

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(JoinRequest)
    private readonly jrRepo: Repository<JoinRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationInvitation)
    private readonly inviteRepo: Repository<OrganizationInvitation>,
    private readonly mailService: OrganizationMailService,
    private readonly configService: ConfigService,
    private readonly domainService: DomainService,
  ) {
    const cronValue = this.configService.get<string>('ORG_REMINDER_CRON');
    const daysValue = this.configService.get<string>('ORG_REMINDER_DAYS');
    console.log('ORG_REMINDER_CRON from env:', cronValue);
    console.log('ORG_REMINDER_DAYS from env:', daysValue);
  }

  private readonly logger = new Logger(OrganizationService.name);
  private readonly ROLE_HIERARCHY = [
    'Viewer',
    'Moderator',
    'Manager',
    'Owner',
  ] as const;
  private readonly roleOrder = (r?: string | null): number =>
    r && this.ROLE_HIERARCHY.includes(r as (typeof this.ROLE_HIERARCHY)[number])
      ? this.ROLE_HIERARCHY.indexOf(r as (typeof this.ROLE_HIERARCHY)[number])
      : -1;

  private async getInvitationContext(token: string, email: string) {
    const invitation = await this.inviteRepo.findOne({
      where: { token, email },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or expired');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new ForbiddenException('User must register with this email first');
    }

    return { invitation, user, organization: invitation.organization };
  }

  private async getCallerContext(userId: string, orgId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const isAdmin = !!user?.isAdmin;
    const callerRole = await this.domainService.getRole(userId, String(orgId));
    return {
      isAdmin,
      callerRole:
        (callerRole as 'Viewer' | 'Moderator' | 'Manager' | 'Owner' | null) ??
        null,
    };
  }

  private canActOn(
    caller: 'Viewer' | 'Moderator' | 'Manager' | 'Owner' | null,
    target: 'Viewer' | 'Moderator' | 'Manager' | 'Owner' | null,
  ) {
    return this.roleOrder(caller) > this.roleOrder(target);
  }

  private ensureAllowed(
    required:
      | ('Viewer' | 'Moderator' | 'Manager' | 'Owner')[]
      | 'OwnerOnly'
      | 'OwnerOrManager',
    ctx: {
      isAdmin: boolean;
      callerRole: 'Viewer' | 'Moderator' | 'Manager' | 'Owner' | null;
    },
  ) {
    if (required === 'OwnerOnly') {
      if (ctx.callerRole !== 'Owner')
        throw new ForbiddenException('Only Owner.');
      return;
    }
    if (required === 'OwnerOrManager') {
      if (ctx.callerRole === 'Owner' || ctx.callerRole === 'Manager') return;
      throw new ForbiddenException('Only Owner or Manager.');
    }
    if (!ctx.callerRole || !required.includes(ctx.callerRole)) {
      throw new ForbiddenException('Insufficient role.');
    }
  }

  private async ensureAtLeastOneOwnerLeft(
    orgId: number,
    removingUserId?: string,
    demotingUserId?: string,
  ) {
    const users = await this.domainService.getAllUsers(String(orgId));
    const owners = users.filter((u) => u.role === 'Owner');
    const ownersLeft = owners
      .map((o) => o.id)
      .filter((id) => id !== removingUserId && id !== demotingUserId).length;
    if (ownersLeft < 1)
      throw new ForbiddenException('At least one Owner must remain.');
  }

  private ensureAdminHasDomainRights(
    ctx: { isAdmin: boolean; callerRole?: string | null },
    action: string,
  ) {
    if (
      ctx.isAdmin &&
      (!ctx.callerRole || ['Viewer', 'Moderator'].includes(ctx.callerRole))
    ) {
      throw new ForbiddenException(
        `Admins who are not Manager or Owner in this organization cannot ${action}.`,
      );
    }
  }

  /**
   * Converts a company name to a normalized, URL-friendly slug base.
   */
  private toSlugBase(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generates a unique slug from a given company name.
   * Ensures uniqueness by appending a numeric suffix if needed.
   * If excludeId is provided, that record is ignored (useful for update).
   */
  async generateUniqueSlug(
    organizationAlias: string,
    excludeId?: number,
  ): Promise<string> {
    const base = this.toSlugBase(organizationAlias);

    if (excludeId) {
      const existingSameOrg = await this.orgRepo.findOne({
        where: { id: excludeId },
      });

      if (existingSameOrg) {
        const currentSlug = existingSameOrg.slug;

        if (currentSlug === base) {
          return currentSlug;
        }

        const match = currentSlug.match(new RegExp(`^${base}(-\\d+)?$`));
        if (match) {
          return currentSlug;
        }
      }
    }

    const qb = this.orgRepo
      .createQueryBuilder('org')
      .select('org.slug')
      .where('org.slug = :base OR org.slug LIKE :pattern', {
        base,
        pattern: `${base}-%`,
      });

    if (excludeId) {
      qb.andWhere('org.id != :excludeId', { excludeId });
    }

    const existing = await qb.getMany();
    const pattern = new RegExp(`^${base}-(\\d+)$`);
    const matching = existing
      .map((o) => o.slug)
      .filter((slug) => slug === base || pattern.test(slug));

    if (matching.length === 0) {
      return base;
    }

    const nums = matching
      .map((o) => {
        const match = o.match(pattern);
        if (match && typeof match[1] === 'string') {
          return parseInt(match[1], 10);
        }
        return 0;
      })
      .filter((n) => !isNaN(n));

    const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
    return `${base}-${nextNum}`;
  }

  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationDto> {
    let retries = 3;
    while (retries > 0) {
      try {
        const slug = await this.generateUniqueSlug(dto.organizationAlias);
        let org = this.orgRepo.create({
          name: dto.name,
          slug,
          description: dto.description ?? '',
          creatorId: userId,
          companyId: dto.companyId.trim(),
          organizationAlias: dto.organizationAlias,
          members: [{ id: userId } as any],
          isPrivate: false,
        });
        org.lastEdit = new Date();
        await this.orgRepo.save(org);
        await this.domainService.create(String(org.id), 'Organization', userId);
        org = await this.orgRepo.findOneOrFail({
          where: { id: org.id },
          relations: ['members', 'creator'],
        });

        return await this.mapToDto(org, org.members, userId);
      } catch (err: unknown) {
        const pgErr = err as { code?: unknown; detail?: unknown };
        if (
          pgErr &&
          pgErr.code === '23505' &&
          typeof pgErr.detail === 'string' &&
          pgErr.detail.includes('slug')
        ) {
          retries--;
          continue;
        }
        throw err;
      }
    }
    throw new BadRequestException(
      'Failed to generate unique slug after multiple attempts',
    );
  }

  async findAllForUser(
    userId: string,
    includeInactive = false,
  ): Promise<OrganizationDto[]> {
    const user: User | null = await this.userRepo.findOne({
      where: { id: userId },
    });

    const where: Record<string, any> = {};
    if (!includeInactive || !user?.isAdmin) {
      where.isActive = true;
    }
    const orgs = await this.orgRepo.find({
      where,
      relations: ['members', 'creator'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      orgs.map((org) => this.mapToDto(org, org.members, userId)),
    );
  }

  async searchAndSortOrganizations(
    query?: string,
    sort: 'newest' | 'asc' | 'desc' = 'newest',
    userId?: string,
    includeInactive = false,
    page = 1,
    limit = 10,
    filterMine = false,
  ): Promise<{
    data: OrganizationDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const qb = this.orgRepo
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.members', 'member')
      .leftJoinAndSelect('organization.creator', 'creator');

    let isAdmin = false;
    if (userId) {
      const user: User | null = await this.userRepo.findOne({
        where: { id: userId },
      });
      isAdmin = !!user?.isAdmin;
    }

    if (query && query.trim().length > 0) {
      qb.where('LOWER(organization.name) LIKE :q', {
        q: `%${query.toLowerCase()}%`,
      });
    }

    if (!isAdmin || !includeInactive) {
      qb.andWhere('organization.isActive = true');
    }

    if (filterMine && userId) {
      qb.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('user_organizations', 'omu')
          .where('omu.organizationId = organization.id')
          .andWhere('omu.userId = :userId')
          .getQuery();
        return `EXISTS ${subQuery}`;
      }).setParameter('userId', userId);
    }

    if (sort === 'asc' || sort === 'desc' || sort === 'newest') {
      qb.addSelect('LOWER(organization.name)', 'lower_name');
    }

    switch (sort) {
      case 'asc':
        qb.orderBy('lower_name', 'ASC');
        break;
      case 'desc':
        qb.orderBy('lower_name', 'DESC');
        break;
      default:
        qb.orderBy('organization.createdAt', 'DESC', 'NULLS LAST').addOrderBy(
          'lower_name',
          'ASC',
        );
        break;
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / limit);

    qb.skip((page - 1) * limit).take(limit);

    const organizations = await qb.getMany();

    const data = await Promise.all(
      organizations.map((org) => this.mapToDto(org, org.members, userId)),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async join(userId: string, orgId: number): Promise<void> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      select: ['id', 'name', 'isActive'],
    });
    if (!org || !org.isActive)
      throw new NotFoundException('Organization not found');

    const isMemberCount = await this.orgRepo
      .createQueryBuilder('org')
      .leftJoin('org.members', 'member')
      .where('org.id = :orgId', { orgId })
      .andWhere('member.id = :userId', { userId })
      .getCount();

    if (isMemberCount > 0) {
      throw new BadRequestException(
        'User is already a member of this organization',
      );
    }

    await this.orgRepo
      .createQueryBuilder()
      .relation(Organization, 'members')
      .of(orgId)
      .add(userId);

    await this.domainService.changeUserRole(String(orgId), userId, 'Viewer');

    this.logger.log(`User ${userId} joined organization ${org.name}`);
  }

  async leave(userId: string, orgId: number): Promise<void> {
    const role = (await this.domainService.getRole(userId, String(orgId))) as
      | 'Viewer'
      | 'Manager'
      | 'Owner'
      | null;

    if (role === 'Owner') {
      await this.ensureAtLeastOneOwnerLeft(orgId, userId);
    }

    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      select: ['id'],
    });
    if (!org) throw new NotFoundException('Organization not found');

    await this.orgRepo
      .createQueryBuilder()
      .relation(Organization, 'members')
      .of(orgId)
      .remove(userId);

    await this.domainService.deleteRole(String(orgId), userId);
  }

  async findOneBySlugForUser(
    userId: string,
    slug: string,
  ): Promise<OrganizationDto> {
    const org = await this.orgRepo.findOne({
      where: { slug },
      relations: ['members', 'creator'],
    });
    if (!org || !org.isActive)
      throw new NotFoundException(`Organization "${slug}" not found`);
    const pendingCount = await this.jrRepo.count({
      where: {
        user: { id: userId },
        organization: { id: org.id },
        status: JoinRequestStatus.PENDING,
      },
    });
    const dto = await this.mapToDto(org, org.members, userId);
    dto.hasPendingRequest = pendingCount > 0;
    dto.isOwner = org.creatorId === userId;
    return dto;
  }

  async findIdBySlug(slug: string): Promise<number | null> {
    const org = await this.orgRepo.findOne({
      where: { slug },
      select: ['id'],
    });
    return org ? org.id : null;
  }

  async findOneForUser(
    userId: string,
    orgId: number,
  ): Promise<OrganizationDto> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members', 'creator'],
    });
    if (!org || !org.isActive)
      throw new NotFoundException(`Organization ${orgId} not found`);
    const pendingCount = await this.jrRepo.count({
      where: {
        user: { id: userId },
        organization: { id: orgId },
        status: JoinRequestStatus.PENDING,
      },
    });
    const dto = await this.mapToDto(org, org.members, userId);
    dto.hasPendingRequest = pendingCount > 0;
    dto.isOwner = org.creatorId === userId;
    return dto;
  }

  async findDuplicates(
    userId: string,
    name?: string,
    companyId?: number,
    organizationAlias?: string,
    excludeId?: number,
  ): Promise<OrganizationDto[]> {
    const qb = this.orgRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.members', 'members')
      .leftJoinAndSelect('org.creator', 'creator');

    qb.where('org.isActive = :active', { active: true });

    if (excludeId) {
      qb.andWhere('org.id != :excludeId', { excludeId });
    }

    type DuplicateParams = {
      companyId?: number;
      organizationAlias?: string;
      name?: string;
      active?: boolean;
      excludeId?: number;
    };
    const filters: string[] = [];
    const params: DuplicateParams = {};

    if (companyId != null) {
      filters.push('org.companyId = :companyId');
      params.companyId = companyId;
    }

    if (organizationAlias?.trim() && organizationAlias.trim().length >= 2) {
      filters.push('org.organizationAlias ILIKE :organizationAlias');
      params.organizationAlias = `%${organizationAlias.trim()}%`;
    }

    if (name?.trim() && name.trim().length >= 2) {
      filters.push('org.name ILIKE :name');
      params.name = `%${name.trim()}%`;
    }

    if (filters.length === 0) {
      return [];
    }

    qb.andWhere(filters.map((f) => `(${f})`).join(' OR '), params)
      .orderBy('org.companyId = :companyId', 'DESC')
      .addOrderBy('org.organizationAlias ILIKE :organizationAlias', 'DESC')
      .addOrderBy('org.name ILIKE :name', 'DESC')
      .setParameters({
        companyId: params.companyId ?? null,
        organizationAlias: params.organizationAlias ?? '',
        name: params.name ?? '',
        active: true,
        excludeId: excludeId ?? null,
      })
      .limit(10);

    const orgs = await qb.getMany();

    return Promise.all(orgs.map((o) => this.mapToDto(o, o.members, userId)));
  }

  async update(
    userId: string,
    orgId: number,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationDto & { newSlug?: string }> {
    let retries = 3;
    while (retries > 0) {
      try {
        const org = await this.orgRepo.findOneOrFail({
          where: { id: orgId },
          relations: ['members', 'creator'],
        });

        const ctx = await this.getCallerContext(userId, orgId);
        if (!ctx.isAdmin) {
          this.ensureAllowed('OwnerOrManager', ctx);
        }

        let slugChanged = false;
        if (
          typeof dto.organizationAlias === 'string' &&
          dto.organizationAlias.trim() !== '' &&
          dto.organizationAlias.trim() !== (org.organizationAlias?.trim() ?? '')
        ) {
          const newAlias = dto.organizationAlias.trim();

          org.organizationAlias = newAlias;
          org.slug = await this.generateUniqueSlug(newAlias, org.id);
          slugChanged = true;
        } else if (
          typeof dto.organizationAlias === 'string' &&
          dto.organizationAlias.trim() === (org.organizationAlias?.trim() ?? '')
        ) {
          dto.organizationAlias = org.organizationAlias;
        }

        if (typeof dto.name === 'string') org.name = dto.name.trim();
        if (typeof dto.description === 'string')
          org.description = dto.description.trim();

        if (
          typeof dto.companyId === 'string' &&
          /^\d{8}$/.test(dto.companyId)
        ) {
          org.companyId = dto.companyId.trim();
        }

        if (typeof dto.isPrivate === 'boolean') {
          org.isPrivate = dto.isPrivate;
        }

        org.modifiedBy = userId;
        org.lastEdit = new Date();
        await this.orgRepo.save(org);

        const updatedDto = await this.mapToDto(org, org.members, userId);

        if (slugChanged) {
          return {
            ...updatedDto,
            newSlug: org.slug,
          };
        }

        return updatedDto;
      } catch (err: unknown) {
        const pgErr = err as { code?: unknown; detail?: unknown };
        if (
          pgErr &&
          pgErr.code === '23505' &&
          typeof pgErr.detail === 'string' &&
          pgErr.detail.includes('slug')
        ) {
          retries--;
          continue;
        }
        throw err;
      }
    }
    throw new BadRequestException(
      'Failed to generate unique slug after multiple attempts',
    );
  }

  async remove(userId: string, orgId: number): Promise<void> {
    const org = await this.orgRepo.findOneOrFail({ where: { id: orgId } });

    const ctx = await this.getCallerContext(userId, orgId);
    this.ensureAllowed(['Owner'], ctx);

    org.isActive = false;
    org.modifiedBy = userId;
    org.lastEdit = new Date();

    await this.orgRepo.save(org);
  }

  async restore(userId: string, orgId: number): Promise<void> {
    const org = await this.orgRepo.findOneOrFail({ where: { id: orgId } });
    const ctx = await this.getCallerContext(userId, orgId);
    if (!ctx.isAdmin) {
      throw new ForbiddenException(
        'Only admins can restore archived organizations.',
      );
    }

    org.isActive = true;
    org.modifiedBy = userId;
    org.lastEdit = new Date();

    await this.orgRepo.save(org);
  }

  async removeMember(
    callerId: string,
    orgId: number,
    memberId: string,
  ): Promise<void> {
    const ctx = await this.getCallerContext(callerId, orgId);
    this.ensureAdminHasDomainRights(ctx, 'remove members');
    this.ensureAllowed('OwnerOrManager', ctx);

    const targetRole = (await this.domainService.getRole(
      memberId,
      String(orgId),
    )) as 'Viewer' | 'Moderator' | 'Manager' | 'Owner' | null;

    if (!this.canActOn(ctx.callerRole, targetRole)) {
      throw new ForbiddenException('You cannot remove a higher-role member.');
    }

    if (targetRole === 'Owner') {
      await this.ensureAtLeastOneOwnerLeft(orgId, memberId);
    }

    await this.orgRepo
      .createQueryBuilder()
      .relation(Organization, 'members')
      .of(orgId)
      .remove({ id: memberId } as any);

    await this.domainService.deleteRole(String(orgId), memberId);
  }

  async createJoinRequest(
    userId: string,
    orgId: number,
    dto: CreateJoinRequestDto,
  ): Promise<JoinRequest> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException(`Org ${orgId} not found`);
    if (org.isPrivate)
      throw new ForbiddenException('This organization is private');

    const role = await this.domainService.getRole(userId, String(org.id));
    if (
      role === 'Owner' ||
      role === 'Manager' ||
      role === 'Viewer' ||
      role === 'Moderator'
    )
      throw new ForbiddenException('Member cannot request to join.');

    // Prevent join requests if an invitation exists for this user
    const userRecord = await this.userRepo.findOne({ where: { id: userId } });
    if (userRecord?.email) {
      const pendingInvite = await this.inviteRepo.findOne({
        where: {
          email: userRecord.email,
          organization: { id: orgId },
          status: InvitationStatus.PENDING,
          expiresAt: MoreThan(new Date()),
        },
      });
      if (pendingInvite) {
        throw new ForbiddenException(
          'You already have an invitation to this organization. Please check your email.',
        );
      }
    }

    const existingRequest = await this.jrRepo.findOne({
      where: {
        user: { id: userId },
        organization: { id: orgId },
        status: JoinRequestStatus.PENDING,
      },
    });
    if (existingRequest) {
      throw new ForbiddenException(
        'You already have a pending join request for this organization.',
      );
    }

    const user = this.userRepo.create({ id: userId });
    const organization = this.orgRepo.create({ id: orgId });
    const jr = this.jrRepo.create({
      message: dto.message,
      user,
      organization,
      status: JoinRequestStatus.PENDING,
      createdAt: new Date(),
    });
    const saved = await this.jrRepo.save(jr);

    const orgUsers = await this.domainService.getAllUsers(String(org.id));
    const notifyUsers = orgUsers.filter(
      (u) => u.role === 'Owner' || u.role === 'Manager',
    );

    const requester = await this.userRepo.findOne({ where: { id: userId } });
    const requesterName = requester
      ? `${requester.firstName} ${requester.lastName}`
      : 'Unknown user';
    const requesterMessage = dto.message?.trim() || '(no message provided)';

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const link = `${frontendUrl}/auth/organizations/${org.slug}/requests/${saved.id}`;

    const emailPromises = notifyUsers.map(async (roleUser) => {
      const dbUser = await this.userRepo.findOne({
        where: { id: roleUser.id },
      });
      if (!dbUser?.email) return;

      await this.mailService.sendJoinRequestEmail(
        dbUser.email,
        dbUser.firstName,
        requesterName,
        org.name,
        requesterMessage,
        link,
      );

      this.logger.log(
        `Sent join request notification to ${dbUser.email} for organization ${org.name} from ${requesterName}`,
      );
    });

    await Promise.all(emailPromises);

    return saved;
  }

  async findPendingRequestsForOrg(
    creatorId: string,
    orgId: number,
  ): Promise<JoinRequestDto[]> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['creator'],
    });
    if (!org) throw new NotFoundException(`Org ${orgId} not found`);
    const ctx = await this.getCallerContext(creatorId, org.id);
    if (!ctx.isAdmin) {
      this.ensureAllowed('OwnerOrManager', ctx);
    }
    const reqs = await this.jrRepo.find({
      where: {
        organization: { id: orgId },
        status: JoinRequestStatus.PENDING,
      },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    return reqs.map((r) => ({
      id: r.id,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
      },
    }));
  }
  async handleJoinRequest(
    callerId: string,
    requestId: number,
    approve: boolean,
  ): Promise<void> {
    const jr = await this.jrRepo.findOneOrFail({
      where: { id: requestId },
      relations: ['organization', 'user'],
    });
    const ctx = await this.getCallerContext(callerId, jr.organization.id);
    this.ensureAdminHasDomainRights(ctx, 'send invitations');
    this.ensureAllowed('OwnerOrManager', ctx);

    if (jr.status !== JoinRequestStatus.PENDING)
      throw new BadRequestException('Already processed');

    jr.status = approve
      ? JoinRequestStatus.APPROVED
      : JoinRequestStatus.REJECTED;

    jr.modifiedBy = callerId;
    jr.modifiedAt = new Date();
    await this.jrRepo.save(jr);

    if (approve) await this.join(jr.user.id, jr.organization.id);
  }

  async findJoinRequestByIdForOwner(
    creatorId: string,
    requestId: number,
  ): Promise<JoinRequestDto> {
    const jr = await this.jrRepo.findOne({
      where: { id: requestId },
      relations: ['user', 'organization'],
    });

    if (!jr) {
      throw new NotFoundException(`Join request ${requestId} not found`);
    }

    const ctx = await this.getCallerContext(creatorId, jr.organization.id);
    this.ensureAdminHasDomainRights(ctx, 'send invitations');
    this.ensureAllowed('OwnerOrManager', ctx);
    return {
      id: jr.id,
      message: jr.message,
      status: jr.status,
      createdAt: jr.createdAt,
      modifiedAt: jr.modifiedAt,
      modifiedBy: jr.modifiedBy,
      user: {
        id: jr.user.id,
        firstName: jr.user.firstName,
        lastName: jr.user.lastName,
      },
    };
  }

  async sendInvitations(
    creatorId: string,
    orgId: number,
    dto: CreateInvitationDto,
  ): Promise<{ sent: string[]; skipped: { email: string; reason: string }[] }> {
    const org = await this.orgRepo.findOneOrFail({
      where: { id: orgId },
      relations: ['members', 'creator'],
    });

    const ctx = await this.getCallerContext(creatorId, org.id);
    this.ensureAdminHasDomainRights(ctx, 'send invitations');
    this.ensureAllowed('OwnerOrManager', ctx);
    const emails = Array.from(
      new Set(
        dto.emails
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0),
      ),
    );

    if (emails.length === 0) {
      throw new BadRequestException('No valid email addresses provided.');
    }

    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sent: string[] = [];
    const skipped: { email: string; reason: string }[] = [];

    for (const email of emails) {
      const existingInvite = await this.inviteRepo.findOne({
        where: {
          organization: { id: org.id },
          email,
          status: InvitationStatus.PENDING,
          expiresAt: MoreThan(new Date()),
        },
      });
      if (existingInvite) {
        skipped.push({ email, reason: 'Invitation already sent' });
        continue;
      }

      const existingUser = await this.userRepo.findOne({ where: { email } });
      if (existingUser && org.members.some((m) => m.id === existingUser.id)) {
        skipped.push({ email, reason: 'User is already a member' });
        continue;
      }

      if (existingUser) {
        const existingRequest = await this.jrRepo.findOne({
          where: {
            user: { id: existingUser.id },
            organization: { id: org.id },
            status: JoinRequestStatus.PENDING,
          },
        });

        if (existingRequest) {
          skipped.push({
            email,
            reason: 'User already has a pending join request',
          });
          continue;
        }
      }

      const token = randomUUID();
      const invitation = this.inviteRepo.create({
        organization: org,
        email,
        token,
        expiresAt: sevenDays,
        createdBy: creatorId,
        modifiedBy: creatorId,
        status: InvitationStatus.PENDING,
        createdAt: new Date(),
      });
      await this.inviteRepo.save(invitation);

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3000';
      const link = `${frontendUrl}/auth/invitations/${token}`;

      await this.mailService.sendInvitationEmail(email, org.name, link);
      sent.push(email);
    }

    this.logger.log(
      `Invitations processed for "${org.name}": ${sent.length} sent, ${skipped.length} skipped.`,
    );

    return { sent, skipped };
  }

  async acceptInvitation(
    token: string,
    email: string,
  ): Promise<{ message: string; slug: string }> {
    const {
      invitation,
      user,
      organization: org,
    } = await this.getInvitationContext(token, email);

    const now = new Date();
    const isExpired = invitation.expiresAt <= now;

    if (
      invitation.status === InvitationStatus.REVOKED ||
      invitation.status === InvitationStatus.REJECTED ||
      isExpired
    ) {
      throw new NotFoundException('Invitation not found or expired');
    }

    const orgEntity = await this.orgRepo.findOne({
      where: { id: org.id },
      relations: ['members'],
    });
    const alreadyMember = !!orgEntity?.members.some((m) => m.id === user.id);

    if (alreadyMember || invitation.status === InvitationStatus.ACCEPTED) {
      if (invitation.status !== InvitationStatus.ACCEPTED) {
        invitation.status = InvitationStatus.ACCEPTED;
        invitation.modifiedBy = user.id;
        invitation.modifiedAt = new Date();
        await this.inviteRepo.save(invitation);
      }
      return {
        message: `You are already a member of ${org.name}.`,
        slug: org.slug,
      };
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found or expired');
    }

    try {
      await this.join(user.id, org.id);
    } catch (err) {
      const driverCode =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code?: string }).code
          : undefined;
      if (
        (err instanceof BadRequestException &&
          err.message?.includes('already a member')) ||
        driverCode === '23505'
      ) {
        invitation.status = InvitationStatus.ACCEPTED;
        invitation.modifiedBy = user.id;
        invitation.modifiedAt = new Date();
        await this.inviteRepo.save(invitation);
        return {
          message: `You are already a member of ${org.name}.`,
          slug: org.slug,
        };
      }
      throw err;
    }

    invitation.status = InvitationStatus.ACCEPTED;
    invitation.modifiedBy = user.id;
    invitation.modifiedAt = new Date();
    await this.inviteRepo.save(invitation);

    this.logger.log(
      `User ${email} joined organization ${org.name} via invitation ${token}`,
    );

    return { message: `User ${email} joined ${org.name}`, slug: org.slug };
  }

  async findPendingInvitations(creatorId: string, orgId: number) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['creator'],
    });
    if (!org) throw new NotFoundException('Organization not found');
    const ctx = await this.getCallerContext(creatorId, org.id);
    if (!ctx.isAdmin) {
      this.ensureAllowed('OwnerOrManager', ctx);
    }

    return this.inviteRepo.find({
      where: {
        organization: { id: orgId },
        status: InvitationStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getInvitationSummary(
    token: string,
    email: string,
  ): Promise<InvitationSummaryResponse> {
    const { invitation, user, organization } = await this.getInvitationContext(
      token,
      email,
    );
    const now = new Date();
    const isExpired = invitation.expiresAt <= now;

    const orgEntity = await this.orgRepo.findOne({
      where: { id: organization.id },
      relations: ['members'],
    });
    const alreadyMember = !!orgEntity?.members.some((m) => m.id === user.id);

    return {
      organization: {
        name: organization.name,
        slug: organization.slug,
      },
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      isExpired,
      alreadyMember,
    };
  }

  async rejectInvitation(token: string, email: string) {
    const { invitation, user, organization } = await this.getInvitationContext(
      token,
      email,
    );
    const now = new Date();
    const isExpired = invitation.expiresAt <= now;

    if (isExpired || invitation.status === InvitationStatus.REVOKED) {
      throw new NotFoundException('Invitation not found or expired');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      return {
        message: `You already joined ${organization.name}.`,
        slug: organization.slug,
      };
    }

    if (invitation.status === InvitationStatus.REJECTED) {
      return { message: 'This invitation was already rejected.' };
    }

    invitation.status = InvitationStatus.REJECTED;
    invitation.modifiedBy = user.id;
    invitation.modifiedAt = new Date();
    await this.inviteRepo.save(invitation);

    this.logger.log(
      `User ${email} rejected invitation ${token} for organization ${organization.name}`,
    );

    return { message: `Invitation rejected for ${organization.name}.` };
  }

  async findInvitationForUser(
    userId: string,
    email: string,
    orgId: number,
  ): Promise<MyInvitationResponse> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    const invitation = await this.inviteRepo.findOne({
      where: {
        email,
        organization: { id: orgId },
        status: InvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!invitation) {
      throw new NotFoundException('No pending invitation found');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      token: invitation.token,
      status: invitation.status,
      organization: { name: org.name, slug: org.slug },
    };
  }

  async findAllInvitations(creatorId: string, orgId: number) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['creator'],
    });
    if (!org) throw new NotFoundException('Organization not found');
    const ctx = await this.getCallerContext(creatorId, org.id);
    if (!ctx.isAdmin) {
      this.ensureAllowed('OwnerOrManager', ctx);
    }

    return this.inviteRepo.find({
      where: { organization: { id: orgId } },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeInvitation(creatorId: string, inviteId: number): Promise<void> {
    const invitation = await this.inviteRepo.findOne({
      where: { id: inviteId },
      relations: ['organization'],
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    const ctx = await this.getCallerContext(
      creatorId,
      invitation.organization.id,
    );
    this.ensureAdminHasDomainRights(ctx, 'send invitations');
    this.ensureAllowed('OwnerOrManager', ctx);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    invitation.status = InvitationStatus.REVOKED;
    invitation.modifiedBy = creatorId;
    invitation.modifiedAt = new Date();
    await this.inviteRepo.save(invitation);
  }

  async sendPendingJoinRequestReminders(): Promise<void> {
    const rawDays = this.configService.get<string>('ORG_REMINDER_DAYS');
    const days = Number(rawDays ?? 7);
    const sevenDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pendingRequests = await this.jrRepo.find({
      where: {
        status: JoinRequestStatus.PENDING,
        createdAt: LessThan(sevenDaysAgo),
      },
      relations: ['organization', 'user'],
    });

    if (pendingRequests.length === 0) return;

    this.logger.log(
      `Found ${pendingRequests.length} pending join requests older than ${days} day(s).`,
    );

    const recipientMap = new Map<
      string,
      {
        user: User;
        requests: {
          orgName: string;
          orgSlug: string;
          requester: string;
          message: string;
          link: string;
        }[];
      }
    >();

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    for (const jr of pendingRequests) {
      const org = jr.organization;

      const domainUsers = await this.domainService.getAllUsers(String(org.id));
      const notifyUsers = domainUsers.filter(
        (u) => u.role === 'Owner' || u.role === 'Manager',
      );

      for (const roleUser of notifyUsers) {
        const dbUser = await this.userRepo.findOne({
          where: { id: roleUser.id },
        });
        if (!dbUser?.email) continue;

        const link = `${frontendUrl}/auth/organizations/${org.slug}/requests/${jr.id}`;
        const requesterName = `${jr.user.firstName} ${jr.user.lastName}`;
        const requesterMessage = jr.message?.trim() || '(no message provided)';

        const record = recipientMap.get(dbUser.email) ?? {
          user: dbUser,
          requests: [],
        };

        record.requests.push({
          orgName: org.name,
          orgSlug: org.slug,
          requester: requesterName,
          message: requesterMessage,
          link,
        });

        recipientMap.set(dbUser.email, record);
      }
    }

    await Promise.all(
      Array.from(recipientMap.entries()).map(
        async ([email, { user, requests }]) => {
          await this.mailService.sendJoinRequestReminderEmail(
            email,
            user.firstName,
            requests,
          );
          this.logger.log(
            `Sent grouped reminder to ${email} with ${requests.length} pending request(s).`,
          );
        },
      ),
    );

    this.logger.log(
      `Reminder emails sent to ${recipientMap.size} recipient(s).`,
    );
  }

  private async mapToDto(
    org: Organization,
    members: User[],
    currentUserId?: string,
  ): Promise<OrganizationDto> {
    const currentUser = currentUserId
      ? await this.userRepo.findOne({ where: { id: currentUserId } })
      : null;

    const isAdmin = !!currentUser?.isAdmin;
    const orgRole = currentUserId
      ? ((await this.domainService.getRole(currentUserId, String(org.id))) as
          | 'Viewer'
          | 'Manager'
          | 'Owner'
          | 'Moderator'
          | null)
      : null;
    const currentUserRole = orgRole ?? (isAdmin ? 'Admin' : null);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      creatorId: org.creatorId,
      creatorName: `${org.creator.firstName} ${org.creator.lastName}`,
      companyId: org.companyId,
      organizationAlias: org.organizationAlias,
      isPrivate: org.isPrivate,
      isActive: org.isActive,
      createdAt: org.createdAt,
      lastEdit: org.lastEdit,
      modifiedBy: org.modifiedBy,
      memberCount: members.length,
      isMember: !!currentUserId && members.some((u) => u.id === currentUserId),
      hasPendingRequest: false,
      isOwner: currentUserRole === 'Owner',
      members: members.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      })),
      currentUserRole: currentUserRole ?? null,
      isAdmin,
      currentUserId,
    };
  }
}
