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
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { MoreThan } from 'typeorm';
import { DomainService } from '../domain-role/domain.service';

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
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly domainService: DomainService,
  ) {}

  private readonly logger = new Logger(OrganizationService.name);
  private readonly ROLE_HIERARCHY = ['Viewer', 'Manager', 'Owner'] as const;
  private readonly roleOrder = (r?: string | null) =>
    r ? this.ROLE_HIERARCHY.indexOf(r as any) : -1;

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
    companyName: string,
    excludeId?: number,
  ): Promise<string> {
    const base = this.toSlugBase(companyName);

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
    const slug = await this.generateUniqueSlug(dto.companyName);
    let org = this.orgRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? '',
      creatorId: userId,
      companyId: dto.companyId.trim(),
      companyName: dto.companyName,
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

  async findAllForUser(userId: string): Promise<OrganizationDto[]> {
    const orgs = await this.orgRepo.find({ relations: ['members', 'creator'] });
    return Promise.all(
      orgs.map((org) => this.mapToDto(org, org.members, userId)),
    );
  }

  async searchAndSortOrganizations(
    query?: string,
    sort: 'newest' | 'asc' | 'desc' = 'newest',
    userId?: string,
  ): Promise<OrganizationDto[]> {
    const qb = this.orgRepo
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.members', 'member')
      .leftJoinAndSelect('organization.creator', 'creator');

    if (query && query.trim().length > 0) {
      qb.where('LOWER(organization.name) LIKE :q', {
        q: `%${query.toLowerCase()}%`,
      });
    }

    switch (sort) {
      case 'asc':
        qb.orderBy('organization.name', 'ASC');
        break;
      case 'desc':
        qb.orderBy('organization.name', 'DESC');
        break;
      default:
        qb.orderBy('organization.createdAt', 'DESC', 'NULLS LAST').addOrderBy(
          'organization.name',
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
    if (!org) throw new NotFoundException('Organization not found');
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
    if (!org) throw new NotFoundException(`Organization "${slug}" not found`);
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
    if (!org) throw new NotFoundException(`Organization ${orgId} not found`);
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
    companyName?: string,
    excludeId?: number,
  ): Promise<OrganizationDto[]> {
    const qb = this.orgRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.members', 'members')
      .leftJoinAndSelect('org.creator', 'creator');
    const orConditions: string[] = [];
    const params: Record<string, any> = {};

    if (name) {
      orConditions.push('org.name ILIKE :name');
      params.name = `%${name.trim()}%`;
    }
    if (companyId != null) {
      orConditions.push('org.companyId = :companyId');
      params.companyId = companyId;
    }
    if (companyName) {
      orConditions.push('org.companyName ILIKE :companyName');
      params.companyName = `%${companyName.trim()}%`;
    }
    if (orConditions.length > 0) {
      qb.where(`(${orConditions.join(' OR ')})`, params);
    }
    if (excludeId) {
      qb.andWhere('org.id != :excludeId', { excludeId });
    }

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
      typeof dto.companyName === 'string' &&
      dto.companyName.trim() !== '' &&
      dto.companyName.trim() !== org.companyName
    ) {
      org.companyName = dto.companyName;
      org.slug = await this.generateUniqueSlug(dto.companyName, org.id);
      slugChanged = true;
    }

    if (typeof dto.name === 'string') org.name = dto.name;
    if (typeof dto.description === 'string') org.description = dto.description;
    if (typeof dto.companyId === 'string' && /^\d{8}$/.test(dto.companyId)) {
      org.companyId = dto.companyId.trim();
    }

    if (typeof dto.isPrivate === 'boolean') {
      org.isPrivate = dto.isPrivate;
    }
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
    const org = await this.orgRepo.findOneOrFail({
      where: { id: orgId },
      relations: ['members', 'creator'],
    });
    const ctx = await this.getCallerContext(userId, orgId);
    this.ensureAllowed(['Owner'], ctx);
    await this.domainService.deleteDomain(String(orgId));
    await this.orgRepo.remove(org);
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

    const owners = await this.domainService.getAllUsers(String(org.id));
    const ownerUsers = owners.filter((u) => u.role === 'Owner');

    const requester = await this.userRepo.findOne({ where: { id: userId } });
    const requesterName = requester
      ? `${requester.firstName} ${requester.lastName}`
      : 'Unknown user';
    const requesterMessage = dto.message?.trim() || '(no message provided)';

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const link = `${frontendUrl}/auth/organizations/${org.slug}/requests/${saved.id}`;

    for (const owner of ownerUsers) {
      const ownerUser = await this.userRepo.findOne({
        where: { id: owner.id },
      });
      if (!ownerUser?.email) continue;

      const email: SendEmailDto = {
        recipient: ownerUser.email,
        subject: `BVV LL Platform: New join request for ${org.name}`,
        html: `<p>Hello ${ownerUser.firstName},</p>
           <p><strong>${requesterName}</strong> has requested to join <strong>${org.name}</strong>.</p>
           <p>Message:</p>
           <blockquote>${requesterMessage}</blockquote>
           <p><a href="${link}">Click here</a> to review and approve or reject the request.</p>
           <p>— BVV Living Lab System</p>`,
        text: `Hello ${ownerUser.firstName}, ${requesterName} has requested to join ${org.name}.
Message: ${requesterMessage}
        Review it here: ${link}`,
      };

      await this.emailService.sendEmail(email);
      this.logger.log(
        `Sent join request notification to ${ownerUser.email} for organization ${org.name} from ${requesterName}`,
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
    this.ensureAllowed('OwnerOrManager', ctx);

    if (jr.status !== JoinRequestStatus.PENDING)
      throw new BadRequestException('Already processed');

    jr.status = approve
      ? JoinRequestStatus.APPROVED
      : JoinRequestStatus.REJECTED;
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

    if (jr.organization.creatorId !== creatorId) {
      throw new ForbiddenException('Only owner/manager may review requests');
    }
    const ctx = await this.getCallerContext(creatorId, jr.organization.id);
    this.ensureAllowed('OwnerOrManager', ctx);
    return {
      id: jr.id,
      message: jr.message,
      status: jr.status,
      createdAt: jr.createdAt,
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

      const token = randomUUID();
      const invitation = this.inviteRepo.create({
        organization: org,
        email,
        token,
        expiresAt: sevenDays,
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
        revoked: false,
        expiresAt: MoreThan(new Date()),
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

    await this.join(user.id, org.id);

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
    this.ensureAllowed('OwnerOrManager', ctx);

    invitation.revoked = true;
    await this.inviteRepo.save(invitation);
  }

  async handlePendingInvitationsForNewUser(
    userId: string,
    email: string,
  ): Promise<void> {
    const pendingInvites = await this.inviteRepo.find({
      where: {
        email,
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['organization'],
    });

    if (pendingInvites.length === 0) return;

    for (const invite of pendingInvites) {
      await this.join(userId, invite.organization.id);
      invite.revoked = true;
      await this.inviteRepo.save(invite);

      this.logger.log(
        `User ${email} automatically joined ${invite.organization.name} via pending invitation`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendPendingJoinRequestReminders(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pendingRequests = await this.jrRepo.find({
      where: {
        status: JoinRequestStatus.PENDING,
        createdAt: LessThan(sevenDaysAgo),
      },
      relations: ['organization', 'user'],
    });

    if (pendingRequests.length === 0) return;

    this.logger.log(
      `Found ${pendingRequests.length} pending join requests older than 7 days.`,
    );

    for (const jr of pendingRequests) {
      const org = jr.organization;
      const creator = await this.userRepo.findOne({
        where: { id: org.creatorId },
      });
      if (!creator?.email) continue;

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3000';
      const link = `${frontendUrl}/auth/organizations/${org.slug}/requests/${jr.id}`;

      const requesterName = `${jr.user.firstName} ${jr.user.lastName}`;
      const requesterMessage = jr.message?.trim() || '(no message provided)';

      const email: SendEmailDto = {
        recipient: creator.email,
        subject: `BVV LL Platform: Reminder: Pending join request for ${org.name}`,
        html: `<p>Hello ${creator.firstName},</p>
         <p>You still have a pending join request for <strong>${org.name}</strong>.</p>
         <p>Requester: <strong>${requesterName}</strong></p>
         <p>Message:</p>
         <blockquote>${requesterMessage}</blockquote>
         <p><a href="${link}">Click here</a> to review and approve or reject the request.</p>
         <p>— BVV Living Lab System</p>`,
        text: `Reminder: You have a pending join request for ${org.name} from ${requesterName}.
        Message: ${requesterMessage}
        Review it here: ${link}`,
      };

      await this.emailService.sendEmail(email);
      this.logger.log(
        `Sent reminder email for join request ${jr.id} (organization ${org.name}) to ${creator.email}`,
      );
    }
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
      companyName: org.companyName,
      isPrivate: org.isPrivate,
      createdAt: org.createdAt,
      lastEdit: org.lastEdit,
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
