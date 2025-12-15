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
import { InvitationTokenDto } from './dto/invitation-token.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { DefineRoles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/domain-role/guards/access-control.guard';
import { OrganizationContextGuard } from './guards/organization-context.guard';
import { GetOrgId } from './decorators/get-org-id.decorator';

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
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async listRequests(@GetUser() user: JwtPayload, @GetOrgId() orgId: number) {
    return this.orgService.findPendingRequestsForOrg(user.id, orgId);
  }

  @Get('search')
  searchOrganizations(
    @GetUser() user: JwtPayload,
    @Query('q') q?: string,
    @Query('sort') sort: 'newest' | 'asc' | 'desc' = 'newest',
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('filterMine') filterMine?: string,
  ) {
    return this.orgService.searchAndSortOrganizations(
      q,
      sort,
      user.id,
      includeInactive === 'true',
      Number(page),
      Number(limit),
      filterMine === 'true',
    );
  }

  @Post(':idOrSlug/join')
  @UseGuards(OrganizationContextGuard)
  async join(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ): Promise<void> {
    return this.orgService.join(user.id, orgId);
  }

  @Post(':idOrSlug/leave')
  @UseGuards(OrganizationContextGuard)
  async leave(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ): Promise<void> {
    return this.orgService.leave(user.id, orgId);
  }

  @Get('duplicates')
  findDuplicates(
    @Req() req: Request,
    @Query('name') name?: string,
    @Query('companyId') companyId?: number,
    @Query('organizationAlias') organizationAlias?: string,
    @Query('excludeId') excludeId?: number,
  ) {
    const userId = (req.user as { id: string }).id;

    return this.orgService.findDuplicates(
      userId,
      name,
      companyId,
      organizationAlias,
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
  @UseGuards(OrganizationContextGuard)
  async findOne(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ): Promise<OrganizationDto> {
    return this.orgService.findOneForUser(user.id, orgId);
  }

  @Post(':idOrSlug/join-requests')
  @UseGuards(OrganizationContextGuard)
  async joinRequest(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
    @Body() dto: CreateJoinRequestDto,
  ) {
    return this.orgService.createJoinRequest(user.id, orgId, dto);
  }

  @Patch(':idOrSlug')
  @DefineRoles('Owner', 'Admin', 'Manager')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async update(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationDto> {
    return this.orgService.update(user.id, orgId, dto);
  }

  @Get(':idOrSlug/join-requests/:reqId')
  @DefineRoles('Owner', 'Manager')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async getRequest(
    @GetUser() user: JwtPayload,
    @Param('reqId') reqId: string,
  ): Promise<JoinRequestDto> {
    const requestId = Number(reqId);
    return this.orgService.findJoinRequestByIdForOwner(user.id, requestId);
  }

  @Get(':idOrSlug/invitations')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async listInvitations(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ) {
    return this.orgService.findPendingInvitations(user.id, orgId);
  }

  @Get('invitations/:token')
  @UseGuards(JwtAuthGuard)
  async getInvitation(
    @GetUser() user: JwtPayload,
    @Param('token') token: string,
  ) {
    if (!user.email) {
      throw new ForbiddenException('Authenticated user has no email in token');
    }
    return this.orgService.getInvitationSummary(token, user.email);
  }

  @Get(':idOrSlug/my-invitation')
  @UseGuards(OrganizationContextGuard, JwtAuthGuard)
  async getMyInvitation(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ) {
    if (!user.email) {
      throw new ForbiddenException('Authenticated user has no email in token');
    }
    return this.orgService.findInvitationForUser(user.id, user.email, orgId);
  }

  @Get(':idOrSlug/invitations/history')
  @DefineRoles('Owner', 'Manager', 'Admin')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async listInvitationHistory(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ) {
    return this.orgService.findAllInvitations(user.id, orgId);
  }

  @Post(':idOrSlug/invitations')
  @DefineRoles('Owner', 'Manager')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async sendInvitations(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.orgService.sendInvitations(user.id, orgId, dto);
  }

  @Delete(':idOrSlug/invitations/:inviteId')
  @DefineRoles('Owner', 'Manager')
  @UseGuards(OrganizationContextGuard, RolesGuard)
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
    @Body() dto: InvitationTokenDto,
  ) {
    if (!user.email) {
      throw new ForbiddenException('Authenticated user has no email in token');
    }

    return this.orgService.acceptInvitation(dto.token, user.email);
  }

  @Post('invitations/reject')
  @UseGuards(JwtAuthGuard)
  async rejectInvitation(
    @GetUser() user: JwtPayload,
    @Body() dto: InvitationTokenDto,
  ) {
    if (!user.email) {
      throw new ForbiddenException('Authenticated user has no email in token');
    }
    return this.orgService.rejectInvitation(dto.token, user.email);
  }

  @Patch(':idOrSlug/join-requests/:reqId/approve')
  @DefineRoles('Owner', 'Manager')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async approve(@GetUser() user: JwtPayload, @Param('reqId') reqId: string) {
    const requestId = Number(reqId);
    return this.orgService.handleJoinRequest(user.id, requestId, true);
  }

  @Patch(':idOrSlug/join-requests/:reqId/reject')
  @DefineRoles('Owner', 'Manager')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async reject(@GetUser() user: JwtPayload, @Param('reqId') reqId: string) {
    const requestId = Number(reqId);
    return this.orgService.handleJoinRequest(user.id, requestId, false);
  }

  @Patch(':idOrSlug/restore')
  @DefineRoles('Admin')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async restore(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ): Promise<void> {
    return this.orgService.restore(user.id, orgId);
  }

  @Delete(':idOrSlug')
  @DefineRoles('Owner', 'Admin')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async remove(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
  ): Promise<void> {
    return this.orgService.remove(user.id, orgId);
  }

  @Delete(':idOrSlug/members/:memberId')
  @DefineRoles('Owner', 'Manager')
  @UseGuards(OrganizationContextGuard, RolesGuard)
  async removeMember(
    @GetUser() user: JwtPayload,
    @GetOrgId() orgId: number,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.orgService.removeMember(user.id, orgId, memberId);
  }
}
