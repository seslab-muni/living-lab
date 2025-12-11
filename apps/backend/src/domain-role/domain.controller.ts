import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DefineRoles } from 'src/common/decorators/roles.decorator';
import { DomainService } from './domain.service';
import { RolesDto } from './dto/roles.dto';
import { RolesGuard } from './guards/access-control.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserService } from 'src/user/user.service';

@ApiTags('Domain')
@Controller('domain')
export class DomainController {
  constructor(
    private domainService: DomainService,
    private userService: UserService,
  ) {}

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
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  async changeUserRole(
    @Param() param: { domainId: string; userId: string },
    @Body() body: RolesDto,
    @GetUser() user: { id: string },
  ) {
    const callerId = user.id;
    await this.userService.findById(callerId, true);
    const callerRole = await this.domainService.getRole(
      callerId,
      param.domainId,
    );
    const targetRole = await this.domainService.getRole(
      param.userId,
      param.domainId,
    );
    const hierarchy = ['Viewer', 'Moderator', 'Manager', 'Owner'];
    const rank = (r: string | null) => (r ? hierarchy.indexOf(r) : -1);

    if (!callerRole) {
      throw new ForbiddenException(
        'You must be a member of this organization to assign roles.',
      );
    }

    if (callerRole === 'Manager' && rank(body.role) > rank('Manager')) {
      throw new ForbiddenException(
        'Managers cannot assign higher than Manager.',
      );
    }

    if (targetRole === 'Owner' && body.role !== 'Owner') {
      const users = await this.domainService.getAllUsers(param.domainId);
      const ownersLeft = users.filter(
        (u) => u.role === 'Owner' && u.id !== param.userId,
      ).length;
      if (ownersLeft < 1) {
        throw new ForbiddenException('At least one Owner must remain.');
      }
    }

    if (rank(body.role) > rank(callerRole)) {
      throw new ForbiddenException(
        'You cannot assign a higher role than your own.',
      );
    }

    if (param.userId !== callerId && rank(targetRole) >= rank(callerRole)) {
      throw new ForbiddenException(
        'You cannot modify the role of someone with an equal or higher rank.',
      );
    }

    return this.domainService.changeUserRole(
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
