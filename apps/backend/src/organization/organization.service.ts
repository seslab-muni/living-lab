import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationDto } from './dto/organization.dto';

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
    let org = this.orgRepo.create({
      name: dto.name,
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

  async findOneForUser(
    userId: string,
    orgId: number,
  ): Promise<OrganizationDto> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['members', 'owner'],
    });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }
    return this.mapToDto(org, org.members, userId);
  }

  private mapToDto(
    org: Organization,
    members: { id: string }[],
    currentUserId?: string,
  ): OrganizationDto {
    return {
      id: org.id,
      name: org.name,
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
    };
  }
}
