import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { NameDto } from './dto/change-name.dto';
import { PasswordDto } from './dto/change-password.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('update')
  @ApiOperation({ summary: 'Update user info' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUserName(@Body() body: NameDto, @Req() req: Express.Request) {
    await this.userService.updateUser(
      (req.user as { id: string; name: string }).id,
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
      (req.user as { id: string; name: string }).id,
      true,
    );
    if (!user) {
      throw new Error('User not found');
    }
    return { user };
  }
}
