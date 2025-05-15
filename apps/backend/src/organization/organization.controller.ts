import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationDto } from './dto/organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  create(@GetUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.orgService.create(user.id, dto);
  }

  @Get()
  findAll(@GetUser() user: JwtPayload) {
    return this.orgService.findAllForUser(user.id);
  }

  @Post(':idOrSlug/join')
  async join(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<void> {
    let orgId: number;
    if (isNaN(Number(idOrSlug))) {
      // treat as slug
      const dto = await this.orgService.findOneBySlugForUser(user.id, idOrSlug);
      orgId = dto.id;
    } else {
      // numeric ID
      orgId = +idOrSlug;
    }
    return this.orgService.join(user.id, orgId);
  }

  @Post(':idOrSlug/leave')
  async leave(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<void> {
    let orgId: number;
    if (isNaN(Number(idOrSlug))) {
      const dto = await this.orgService.findOneBySlugForUser(user.id, idOrSlug);
      orgId = dto.id;
    } else {
      orgId = +idOrSlug;
    }
    return this.orgService.leave(user.id, orgId);
  }

  @Get(':idOrSlug')
  async findOne(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<OrganizationDto> {
    // if it’s not a pure number, treat it as a slug
    if (isNaN(Number(idOrSlug))) {
      return this.orgService.findOneBySlugForUser(user.id, idOrSlug);
    }
    // otherwise parse as numeric ID
    return this.orgService.findOneForUser(user.id, +idOrSlug);
  }
}
