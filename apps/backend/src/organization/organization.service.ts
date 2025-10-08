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

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(JoinRequest)
    private jrRepo: Repository<JoinRequest>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Converts a company name to a normalized, URL-friendly slug base.
   */
  private toSlugBase(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // odstráni diakritiku
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // medzery → pomlčky
      .replace(/[^a-z0-9-]/g, '') // povolené len písmená, čísla a pomlčky
      .replace(/^-+|-+$/g, ''); // odstráni pomlčky na začiatku/konci
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
      description: dto.description ?? 'your description goes here',
      ownerId: userId,
      companyId: dto.companyId,
      companyName: dto.companyName,
      members: [{ id: userId } as any],
    });
    await this.orgRepo.save(org);
    org = await this.orgRepo.findOneOrFail({
      where: { id: org.id },
      relations: ['members', 'owner'],
    });

    return this.mapToDto(org, org.members, userId);
  }

  async findAllForUser(userId: string): Promise<OrganizationDto[]> {
    const orgs = await this.orgRepo.find({ relations: ['members', 'owner'] });
    return orgs.map((org) => this.mapToDto(org, org.members, userId));
  }

  async join(userId: string, orgId: number): Promise<void> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members'],
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.members.some((u) => u.id === userId)) {
      org.members.push({ id: userId } as any);
      await this.orgRepo.save(org);
    }
  }

  async leave(userId: string, orgId: number): Promise<void> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members'],
    });
    if (!org) throw new NotFoundException('Organization not found');
    org.members = org.members.filter((u) => u.id !== userId);
    await this.orgRepo.save(org);
  }

  async findOneBySlugForUser(
    userId: string,
    slug: string,
  ): Promise<OrganizationDto> {
    const org = await this.orgRepo.findOne({
      where: { slug },
      relations: ['members', 'owner'],
    });
    if (!org) throw new NotFoundException(`Organization "${slug}" not found`);
    const pendingCount = await this.jrRepo.count({
      where: {
        user: { id: userId },
        organization: { id: org.id },
        status: JoinRequestStatus.PENDING,
      },
    });
    const dto = this.mapToDto(org, org.members, userId);
    dto.hasPendingRequest = pendingCount > 0;
    dto.isOwner = org.ownerId === userId;
    return dto;
  }

  async findOneForUser(
    userId: string,
    orgId: number,
  ): Promise<OrganizationDto> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members', 'owner'],
    });
    if (!org) throw new NotFoundException(`Organization ${orgId} not found`);
    const pendingCount = await this.jrRepo.count({
      where: {
        user: { id: userId },
        organization: { id: orgId },
        status: JoinRequestStatus.PENDING,
      },
    });
    const dto = this.mapToDto(org, org.members, userId);
    dto.hasPendingRequest = pendingCount > 0;
    dto.isOwner = org.ownerId === userId;
    return dto;
  }

  async findDuplicates(
    userId: string,
    name?: string,
    companyId?: number,
    companyName?: string,
  ): Promise<OrganizationDto[]> {
    const qb = this.orgRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.members', 'members')
      .leftJoinAndSelect('org.owner', 'owner');
    if (name) {
      qb.orWhere('org.name ILIKE :name', { name: `%${name.trim()}%` });
    }
    if (companyId != null) {
      qb.orWhere('org.companyId = :companyId', { companyId });
    }
    if (companyName) {
      qb.orWhere('org.companyName ILIKE :companyName', {
        companyName: `%${companyName.trim()}%`,
      });
    }

    const orgs = await qb.getMany();
    return orgs.map((o) => this.mapToDto(o, o.members, userId));
  }

  async update(
    userId: string,
    orgId: number,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationDto & { newSlug?: string }> {
    const org = await this.orgRepo.findOneOrFail({
      where: { id: orgId },
      relations: ['members', 'owner'],
    });

    if (org.ownerId !== userId) {
      throw new ForbiddenException('Only owner can edit');
    }

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
    if (typeof dto.companyId === 'number') org.companyId = dto.companyId;

    org.lastEdit = new Date();
    await this.orgRepo.save(org);

    const updatedDto = this.mapToDto(org, org.members, userId);

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
      relations: ['members', 'owner'],
    });
    if (org.ownerId !== userId) {
      throw new ForbiddenException('Only owner can delete');
    }
    await this.orgRepo.remove(org);
  }

  async removeMember(
    ownerId: string,
    orgId: number,
    memberId: string,
  ): Promise<void> {
    const org = await this.orgRepo.findOneOrFail({
      where: { id: orgId },
      relations: ['owner', 'members'],
    });
    if (org.ownerId !== ownerId) {
      throw new ForbiddenException('Only owner can remove members');
    }
    if (memberId === ownerId) {
      throw new BadRequestException('Owner cannot remove themselves');
    }
    await this.orgRepo
      .createQueryBuilder()
      .relation(Organization, 'members')
      .of(org)
      .remove({ id: memberId } as any);
  }

  async createJoinRequest(
    userId: string,
    orgId: number,
    dto: CreateJoinRequestDto,
  ): Promise<JoinRequest> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException(`Org ${orgId} not found`);

    // owner cannot request to join their own org
    if (org.ownerId === userId) {
      throw new ForbiddenException(`Owner cannot request to join`);
    }

    const user = this.userRepo.create({ id: userId });
    const organization = this.orgRepo.create({ id: orgId });
    const jr = this.jrRepo.create({
      message: dto.message,
      user,
      organization,
      status: JoinRequestStatus.PENDING,
    });
    return this.jrRepo.save(jr);
  }

  async findPendingRequestsForOrg(
    ownerId: string,
    orgId: number,
  ): Promise<JoinRequestDto[]> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['owner'],
    });
    if (!org) throw new NotFoundException(`Org ${orgId} not found`);
    if (org.ownerId !== ownerId) {
      throw new ForbiddenException();
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
    ownerId: string,
    requestId: number,
    approve: boolean,
  ): Promise<void> {
    const jr = await this.jrRepo.findOneOrFail({
      where: { id: requestId },
      relations: ['organization', 'user'],
    });
    if (jr.organization.ownerId !== ownerId) {
      throw new ForbiddenException();
    }
    if (jr.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('Already processed');
    }
    jr.status = approve
      ? JoinRequestStatus.APPROVED
      : JoinRequestStatus.REJECTED;
    await this.jrRepo.save(jr);

    if (approve) {
      await this.orgRepo
        .createQueryBuilder()
        .relation(Organization, 'members')
        .of(jr.organization.id)
        .add(jr.user.id);
    }
  }

  async findJoinRequestByIdForOwner(
    ownerId: string,
    requestId: number,
  ): Promise<JoinRequestDto> {
    const jr = await this.jrRepo.findOneOrFail({
      where: { id: requestId },
      relations: ['user', 'organization'],
    });
    if (jr.organization.ownerId !== ownerId) {
      throw new ForbiddenException('Only owner may review requests');
    }
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

  private mapToDto(
    org: Organization,
    members: User[],
    currentUserId?: string,
  ): OrganizationDto {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      ownerId: org.ownerId,
      ownerName: `${org.owner.firstName} ${org.owner.lastName}`,
      companyId: org.companyId,
      companyName: org.companyName,
      lastEdit: org.lastEdit,
      memberCount: members.length,
      isMember: currentUserId
        ? members.some((u) => u.id === currentUserId)
        : false,
      hasPendingRequest: false,
      isOwner: false,
      members: members.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      })),
    };
  }
}
