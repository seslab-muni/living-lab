import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DefineRoles } from 'src/common/decorators/roles.decorator';
import { DomainService } from './domain.service';
import { RolesDto } from './dto/roles.dto';
import { RolesGuard } from './guards/access-control.guard';

@ApiTags('Domain')
@Controller('domain')
export class DomainController {
  constructor(private domainService: DomainService) {}

  @Get('/:domainId/users')
  @DefineRoles('Admin', 'Owner', 'Manager', 'Moderator', 'Viewer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'All users with roles in this domain.' })
  @ApiResponse({ status: 200, description: 'All users returned succesfully' })
  async allUsers(@Param() param: { domainId: string }) {
    return await this.domainService.getAllUsers(param.domainId);
  }

  @Get('/:domainId/notmembers')
  @DefineRoles('Admin', 'Owner', 'Manager')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'All users with no roles in this domain.' })
  @ApiResponse({ status: 200, description: 'All users returned succesfully' })
  async allNotmembers(@Param() param: { domainId: string }) {
    return await this.domainService.getAllNotMembers(param.domainId);
  }

  @Put('/:domainId/users/:userId/role')
  @DefineRoles('Admin', 'Owner', 'Manager')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update user role in a domain.' })
  @ApiResponse({ status: 200, description: 'Role updated succesfully.' })
  async changeUserRole(
    @Param() param: { domainId: string; userId: string },
    @Body() body: RolesDto,
  ) {
    return await this.domainService.changeUserRole(
      param.domainId,
      param.userId,
      body.role,
    );
  }

  @Put('/:domainId/users/:userId/delete')
  @DefineRoles('Admin', 'Owner', 'Manager')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Users role/membership in this domain revoked.' })
  @ApiResponse({
    status: 200,
    description: 'Users role/membership revoked succesfully',
  })
  async deleteRole(@Param() param: { domainId: string; userId: string }) {
    return await this.domainService.deleteRole(param.domainId, param.userId);
  }
}
