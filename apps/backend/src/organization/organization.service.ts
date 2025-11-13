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
import { EmailService } from 'src/email/email.service';
import { SendEmailDto } from 'src/email/dto/email.dto';
import { ConfigService } from '@nestjs/config';
import { CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { MoreThan } from 'typeorm';
import { DomainService } from '../domain-role/domain.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class OrganizationService implements OnModuleInit {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(JoinRequest)
    private readonly jrRepo: Repository<JoinRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationInvitation)
    private readonly inviteRepo: Repository<OrganizationInvitation>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly domainService: DomainService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    const cronValue = this.configService.get<string>('ORG_REMINDER_CRON');
    const daysValue = this.configService.get<string>('ORG_REMINDER_DAYS');
    console.log('ORG_REMINDER_CRON from env:', cronValue);
    console.log('ORG_REMINDER_DAYS from env:', daysValue);
  }

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
        await this.sendPendingJoinRequestReminders();
      } catch (error) {
        this.logger.error('Error running reminder job', error);
      }
    });

    this.schedulerRegistry.addCronJob('organizationReminders', job);
    job.start();
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

  private async getCallerContext(userId: string, orgId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const isAdmin = !!user?.isAdmin;
    const callerRole = await this.domainService.getRole(userId, String(orgId));
    return {
      isAdmin,
      callerRole: (callerRole as 'Viewer' | 'Manager' | 'Owner' | null) ?? null,
    };
  }

  private canActOn(
    caller: 'Viewer' | 'Manager' | 'Owner' | null,
    target: 'Viewer' | 'Manager' | 'Owner' | null,
    isAdmin: boolean,
  ) {
    if (isAdmin) return true;
    return this.roleOrder(caller) >= this.roleOrder(target);
  }

  private ensureAllowed(
    required:
      | ('Viewer' | 'Manager' | 'Owner')[]
      | 'OwnerOnly'
      | 'OwnerOrManager',
    ctx: {
      isAdmin: boolean;
      callerRole: 'Viewer' | 'Manager' | 'Owner' | null;
    },
  ) {
    if (ctx.isAdmin) return;
    if (required === 'OwnerOnly') {
      if (ctx.callerRole !== 'Owner')
        throw new ForbiddenException('Only Owner or Admin.');
      return;
    }
    if (required === 'OwnerOrManager') {
      if (ctx.callerRole === 'Owner' || ctx.callerRole === 'Manager') return;
      throw new ForbiddenException('Only Owner/Manager or Admin.');
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

    if (existing.length === 0) {
      return base;
    }

    const nums = existing
      .map((o) => {
        const match = o.slug.match(new RegExp(`^${base}-(\\d+)$`));
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
    await this.orgRepo.save(org);
    await this.domainService.create(String(org.id), 'Organization', userId);
    org = await this.orgRepo.findOneOrFail({
      where: { id: org.id },
      relations: ['members', 'creator'],
    });

    return await this.mapToDto(org, org.members, userId);
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
  ): Promise<OrganizationDto[]> {
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

    switch (sort) {
      case 'asc':
        qb.orderBy('LOWER(organization.name)', 'ASC');
        break;
      case 'desc':
        qb.orderBy('LOWER(organization.name)', 'DESC');
        break;
      default:
        qb.orderBy('organization.createdAt', 'DESC', 'NULLS LAST').addOrderBy(
          'LOWER(organization.name)',
          'ASC',
        );
        break;
    }

    const organizations = await qb.getMany();

    return Promise.all(
      organizations.map((org) => this.mapToDto(org, org.members, userId)),
    );
  }

  async join(userId: string, orgId: number): Promise<void> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members'],
    });
    if (!org || !org.isActive)
      throw new NotFoundException('Organization not found');
    if (org.members.some((u) => u.id === userId)) {
      throw new BadRequestException(
        'User is already a member of this organization',
      );
    }

    const userRef = new User();
    userRef.id = userId;

    org.members.push(userRef);
    await this.orgRepo.save(org);
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
      relations: ['members'],
    });
    if (!org) throw new NotFoundException('Organization not found');
    org.members = org.members.filter((u) => u.id !== userId);
    await this.orgRepo.save(org);
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
    const org = await this.orgRepo.findOneOrFail({
      where: { id: orgId },
      relations: ['members', 'creator'],
    });

    const ctx = await this.getCallerContext(userId, orgId);
    this.ensureAllowed('OwnerOrManager', ctx);

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

    if (typeof dto.companyId === 'string' && /^\d{8}$/.test(dto.companyId)) {
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
    this.ensureAllowed('OwnerOrManager', ctx);

    const targetRole = (await this.domainService.getRole(
      memberId,
      String(orgId),
    )) as 'Viewer' | 'Manager' | 'Owner' | null;

    if (!this.canActOn(ctx.callerRole, targetRole, ctx.isAdmin)) {
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
    if (role === 'Owner' || role === 'Manager' || role === 'Viewer')
      throw new ForbiddenException('Member cannot request to join.');

    const user = this.userRepo.create({ id: userId });
    const organization = this.orgRepo.create({ id: orgId });
    const jr = this.jrRepo.create({
      message: dto.message,
      user,
      organization,
      status: JoinRequestStatus.PENDING,
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

    for (const user of notifyUsers) {
      const dbUser = await this.userRepo.findOne({
        where: { id: user.id },
      });
      if (!dbUser?.email) continue;

      const email: SendEmailDto = {
        recipient: dbUser.email,
        subject: `BVV LL Platform: New join request for ${org.name}`,
        html: `<p>Hello ${dbUser.firstName},</p>
           <p><strong>${requesterName}</strong> has requested to join <strong>${org.name}</strong>.</p>
           <p>Message:</p>
           <blockquote>${requesterMessage}</blockquote>
           <p><a href="${link}">Click here</a> to review and approve or reject the request.</p>
           <p>— BVV Living Lab System</p>`,
        text: `Hello ${dbUser.firstName}, ${requesterName} has requested to join ${org.name}.
Message: ${requesterMessage}
        Review it here: ${link}`,
      };

      await this.emailService.sendEmail(email);
      this.logger.log(
        `Sent join request notification to ${dbUser.email} for organization ${org.name} from ${requesterName}`,
      );
    }

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
    this.ensureAllowed('OwnerOrManager', ctx);
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
          revoked: false,
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
      });
      await this.inviteRepo.save(invitation);

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3000';
      const link = `${frontendUrl}/auth/invitations/${token}`;

      const emailDto: SendEmailDto = {
        recipient: email,
        subject: `BVV LL Platform: Invitation to join ${org.name}`,
        html: `<p>Hello,</p>
             <p>You have been invited to join <strong>${org.name}</strong>.</p>
             <p><a href="${link}">Click here</a> to accept the invitation. This link is valid for 7 days.</p>
             <p>— BVV Living Lab System</p>`,
        text: `You have been invited to join ${org.name}. Accept here: ${link}`,
      };

      await this.emailService.sendEmail(emailDto);
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
    const invitation = await this.inviteRepo.findOne({
      where: {
        token,
        email,
      },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or expired');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new ForbiddenException('User must register with this email first');
    }

    const org = invitation.organization;
    const now = new Date();
    const isExpired = invitation.expiresAt <= now;

    const orgEntity = await this.orgRepo.findOne({
      where: { id: org.id },
      relations: ['members'],
    });
    const alreadyMember = !!orgEntity?.members.some((m) => m.id === user.id);

    if (alreadyMember) {
      if (!invitation.revoked) {
        invitation.revoked = true;
        await this.inviteRepo.save(invitation);
      }
      return {
        message: `You are already a member of ${org.name}.`,
        slug: org.slug,
      };
    }

    if (invitation.revoked || isExpired) {
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
        invitation.revoked = true;
        await this.inviteRepo.save(invitation);
        return {
          message: `You are already a member of ${org.name}.`,
          slug: org.slug,
        };
      }
      throw err;
    }

    invitation.revoked = true;
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
    this.ensureAllowed('OwnerOrManager', ctx);

    return this.inviteRepo.find({
      where: { organization: { id: orgId }, revoked: false },
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

    invitation.revoked = true;
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

    for (const [email, { user, requests }] of recipientMap.entries()) {
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
      <p>Hello ${user.firstName},</p>
      <p>You have ${requests.length} pending join request(s) awaiting review:</p>
      <ul>${requestListHtml}</ul>
      <p>— BVV Living Lab System</p>
    `;

      const emailText =
        `Hello ${user.firstName}, you have ${requests.length} pending join request(s):\n\n` +
        requests
          .map(
            (r) =>
              `- ${r.requester} → ${r.orgName}\n  Message: ${r.message}\n  Review: ${r.link}`,
          )
          .join('\n\n');

      const emailDto: SendEmailDto = {
        recipient: email,
        subject: `BVV LL Platform: You have ${requests.length} pending join request(s)`,
        html: emailHtml,
        text: emailText,
      };

      await this.emailService.sendEmail(emailDto);
      this.logger.log(
        `Sent grouped reminder to ${email} with ${requests.length} pending request(s).`,
      );
    }

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
    let currentUserRole = currentUserId
      ? await this.domainService.getRole(currentUserId, String(org.id))
      : null;

    if (isAdmin) {
      currentUserRole = 'Admin';
    }

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
