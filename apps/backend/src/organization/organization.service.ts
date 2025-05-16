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
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}
  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationDto> {
    const base = dto.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    let slug = base;
    let counter = 1;
    while (await this.orgRepo.findOne({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
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
    return this.mapToDto(org, org.members, userId);
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
    return this.mapToDto(org, org.members, userId);
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

    // only add WHERE clauses for provided fields
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
  ): Promise<OrganizationDto> {
    const org = await this.orgRepo.findOneOrFail({
      where: { id: orgId },
      relations: ['members', 'owner'],
    });
    if (org.ownerId !== userId) {
      throw new ForbiddenException('Only owner can edit');
    }
    if (typeof dto.name === 'string') org.name = dto.name;
    if (typeof dto.description === 'string') org.description = dto.description;
    if (typeof dto.companyId === 'number') org.companyId = dto.companyId;
    if (typeof dto.companyName === 'string') org.companyName = dto.companyName;

    org.lastEdit = new Date();
    await this.orgRepo.save(org);
    return this.mapToDto(org, org.members, userId);
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
      members: members.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      })),
    };
  }
}
