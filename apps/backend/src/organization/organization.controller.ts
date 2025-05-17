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

  @Get(':idOrSlug/join-requests')
  async listRequests(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ) {
    const orgId = isNaN(+idOrSlug)
      ? (await this.orgService.findOneBySlugForUser(user.id, idOrSlug)).id
      : +idOrSlug;
    return this.orgService.findPendingRequestsForOrg(user.id, orgId);
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
  async findDuplicates(
    @GetUser() user: JwtPayload,
    @Query('name') name?: string,
    @Query('companyId') companyId?: string,
    @Query('companyName') companyName?: string,
  ): Promise<OrganizationDto[]> {
    return this.orgService.findDuplicates(
      user.id,
      name,
      companyId ? +companyId : undefined,
      companyName,
    );
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
  async getRequest(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Param('reqId') reqId: string,
  ): Promise<JoinRequestDto> {
    const requestId = Number(reqId);
    return this.orgService.findJoinRequestByIdForOwner(user.id, requestId);
  }

  @Patch(':idOrSlug/join-requests/:reqId/approve')
  async approve(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Param('reqId') reqId: string,
  ) {
    const requestId = Number(reqId);
    return this.orgService.handleJoinRequest(user.id, requestId, true);
  }

  @Patch(':idOrSlug/join-requests/:reqId/reject')
  async reject(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
    @Param('reqId') reqId: string,
  ) {
    const requestId = Number(reqId);
    return this.orgService.handleJoinRequest(user.id, requestId, false);
  }

  @Delete(':idOrSlug')
  remove(
    @GetUser() user: JwtPayload,
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<void> {
    const id = +idOrSlug;
    if (isNaN(id)) {
      return this.orgService
        .findOneBySlugForUser(user.id, idOrSlug)
        .then((found) => this.orgService.remove(user.id, found.id));
    }
    return this.orgService.remove(user.id, id);
  }

  @Delete(':idOrSlug/members/:memberId')
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
