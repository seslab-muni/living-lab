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
  create(@Body() dto: CreateOrganizationDto, @GetUser() user: JwtPayload) {
    dto.ownerId = user.id;
    return this.orgService.create(dto);
  }

  @Get()
  findAll(@GetUser() user: JwtPayload) {
    return this.orgService.findAllForUser(user.id);
  }

  @Post(':id/join')
  join(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.orgService.join(user.id, +id);
  }

  @Post(':id/leave')
  leave(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.orgService.leave(user.id, +id);
  }

  @Get(':id')
  async findOne(
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<OrganizationDto> {
    return this.orgService.findOneForUser(user.id, +id);
  }
}
