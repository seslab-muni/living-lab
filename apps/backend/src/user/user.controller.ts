import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { NameDto } from './dto/change-name.dto';
import { PasswordDto } from './dto/change-password.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DefineRoles } from 'src/common/decorators/roles.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('update')
  @ApiOperation({ summary: 'Update user info' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUserName(@Body() body: NameDto, @Req() req: Express.Request) {
    await this.userService.updateUser(
      (req.user as { id: string; name: string; isAdmin: boolean }).id,
      body,
    );
    return { message: 'User info updated successfully' };
  }

  @Put('password')
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({
    status: 200,
    description: 'User password updated successfully',
  })
  async updateUserPassword(
    @Body() body: PasswordDto,
    @Req() req: Express.Request,
  ) {
    if (body.password !== body.passwordConfirm) {
      throw new Error('Passwords do not match');
    }
    if (
      !(await this.userService.isPasswordValid(
        (req.user as { id: string; name: string }).id,
        body.oldPassword,
      ))
    ) {
      throw new Error('Old password is incorrect');
    }
    await this.userService.changePassword(
      (req.user as { id: string; name: string }).id,
      body.password,
    );
    return { message: 'Password changed successfully' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  async getCurrentUser(@Req() req: Express.Request) {
    const user = await this.userService.findById(
      (req.user as { id: string; name: string; isAdmin: boolean }).id,
      true,
    );
    if (!user) {
      throw new Error('User not found');
    }
    return { user };
  }

  @Get()
  @DefineRoles('Admin')
  @ApiOperation({ summary: 'Get all users info' })
  @ApiResponse({
    status: 200,
    description: 'Users info retrieved successfully',
  })
  async getAllActiveUser() {
    return await this.userService.getAllActive();
  }

  @Put('/edit-admin/:id')
  @DefineRoles('Admin')
  @ApiOperation({ summary: 'Change current admin status' })
  @ApiResponse({
    status: 200,
    description: 'Admin status changed successfully',
  })
  async editAdmin(@Param() param: { id: string }) {
    const user = await this.userService.findById(param.id, true);
    if (!user) {
      throw new NotFoundException("User with this ID doesn't exist.");
    }
    return await this.userService.changeAdminRights(param.id, !user.isAdmin);
  }

  @Put('/edit-name/:id')
  @DefineRoles('Admin')
  @ApiOperation({ summary: 'Change this users name' })
  @ApiResponse({ status: 200, description: 'Name changed successfully' })
  async editName(@Param() param: { id: string }, @Body() body: NameDto) {
    return await this.userService.updateUser(param.id, body);
  }

  @Put('/delete/:id')
  @DefineRoles('Admin')
  @ApiOperation({ summary: 'Delete this user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async delete(@Param() param: { id: string }) {
    return await this.userService.activateUser(param.id, { active: false });
  }
}
