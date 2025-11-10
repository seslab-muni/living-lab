import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
  Patch,
  Delete,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationDto } from './dto/organization.dto';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { JoinRequestDto } from './dto/join-request.dto';
import type { Request } from 'express';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { DefineRoles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/domain-role/guards/access-control.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  create(@GetUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.orgService.create(user.id, dto);
  }

  @Get()
  findAll(
    @GetUser() user: JwtPayload,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.orgService.findAllForUser(user.id, includeInactive === 'true');
  }

  @Get(':idOrSlug/join-requests')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async listRequests(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ) {
    const orgId = isNaN(+idOrSlug)
      ? (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id
      : +idOrSlug;
    return this.orgService.findPendingRequestsForOrg(user.id, orgId);
  }

  @Get('search')
  searchOrganizations(
    @GetUser() user: JwtPayload,
    @Query('q') q?: string,
    @Query('sort') sort: 'newest' | 'asc' | 'desc' = 'newest',
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.orgService.searchAndSortOrganizations(
      q,
      sort,
      user.id,
      includeInactive === 'true',
    );
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

  @Get('duplicates')
  findDuplicates(
    @Req() req: Request,
    @Query('name') name?: string,
    @Query('companyId') companyId?: number,
    @Query('companyName') companyName?: string,
    @Query('excludeId') excludeId?: number,
  ) {
    const userId = (req.user as { id: string }).id;

    return this.orgService.findDuplicates(
      userId,
      name,
      companyId,
      companyName,
      excludeId,
    );
  }

  @Get('slug-preview')
  async getSlugPreview(
    @Query('alias') alias: string,
    @Query('excludeId') excludeId?: number,
  ) {
    if (!alias || alias.trim() === '') {
      throw new BadRequestException('Alias is required');
    }

    const slug = await this.orgService.generateUniqueSlug(
      alias.trim(),
      excludeId,
    );
    return { alias, slug };
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

  @Post(':idOrSlug/join-requests')
  async joinRequest(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CreateJoinRequestDto,
  ) {
    const id = isNaN(Number(idOrSlug))
      ? (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id
      : +idOrSlug;

    return this.orgService.createJoinRequest(user.id, id, dto);
  }

  @Patch(':idOrSlug')
  @DefineRoles('Owner', 'Admin', 'Manager')
  @UseGuards(RolesGuard)
  async update(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationDto> {
    // decide whether idOrSlug is a number or a slug
    const isNum = !isNaN(Number(idOrSlug));
    const id = isNum
      ? Number(idOrSlug)
      : (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id;

    return this.orgService.update(user.id, id, dto);
  }

  @Get(':idOrSlug/join-requests/:reqId')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async getRequest(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Param('reqId') reqId: string,
  ): Promise<JoinRequestDto> {
    const requestId = Number(reqId);
    return this.orgService.findJoinRequestByIdForOwner(user.id, requestId);
  }

  @Get(':idOrSlug/invitations')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async listInvitations(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ) {
    const id = isNaN(Number(idOrSlug))
      ? (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id
      : +idOrSlug;
    return this.orgService.findPendingInvitations(user.id, id);
  }

  @Post(':idOrSlug/invitations')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async sendInvitations(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CreateInvitationDto,
  ) {
    const id = isNaN(Number(idOrSlug))
      ? (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id
      : +idOrSlug;
    return this.orgService.sendInvitations(user.id, id, dto);
  }

  @Delete(':idOrSlug/invitations/:inviteId')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async revokeInvitation(
    @GetUser() user: JwtPayload,
    @Param('inviteId') inviteId: string,
  ) {
    return this.orgService.revokeInvitation(user.id, +inviteId);
  }

  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @GetUser() user: JwtPayload,
    @Body() dto: AcceptInvitationDto,
  ) {
    if (!user.email) {
      throw new ForbiddenException('Authenticated user has no email in token');
    }

    return this.orgService.acceptInvitation(dto.token, user.email);
  }

  @Patch(':idOrSlug/join-requests/:reqId/approve')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async approve(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Param('reqId') reqId: string,
  ) {
    const requestId = Number(reqId);
    return this.orgService.handleJoinRequest(user.id, requestId, true);
  }

  @Patch(':idOrSlug/join-requests/:reqId/reject')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async reject(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Param('reqId') reqId: string,
  ) {
    const requestId = Number(reqId);
    return this.orgService.handleJoinRequest(user.id, requestId, false);
  }

  @Patch(':idOrSlug/restore')
  @UseGuards(JwtAuthGuard)
  async restore(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<void> {
    const id = isNaN(+idOrSlug)
      ? (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id
      : +idOrSlug;
    return this.orgService.restore(user.id, id);
  }

  @Delete(':idOrSlug')
  @DefineRoles('Owner', 'Admin')
  @UseGuards(RolesGuard)
  async remove(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<void> {
    const id = +idOrSlug;
    if (isNaN(id)) {
      const found = await this.orgService.findOneBySlugForUser(
        user.id,
        idOrSlug,
      );
      return await this.orgService.remove(user.id, found.id);
    }
    return this.orgService.remove(user.id, id);
  }

  @Delete(':idOrSlug/members/:memberId')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(RolesGuard)
  async removeMember(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    const id = isNaN(+idOrSlug)
      ? (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id
      : +idOrSlug;

    return this.orgService.removeMember(user.id, id, memberId);
  }
}
