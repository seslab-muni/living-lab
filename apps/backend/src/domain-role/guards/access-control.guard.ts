import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { Roles } from 'src/common/types/roles';
import { DomainService } from '../domain.service';
import { UserService } from 'src/user/user.service';

interface RequestWithUser extends Request {
  user: {
    id: string;
    isAdmin: boolean;
  };
  domainId: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private domainService: DomainService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const { user, domainId } = request;
    if (!user || !user.id || !domainId) {
      return false;
    }
    return this.validateAccess(user.id, domainId, roles);
  }

  private async validateAccess(
    user_id: string,
    domain_id: string,
    roles: Roles[],
  ): Promise<boolean> {
    if (roles.includes('Admin')) {
      const user = await this.userService.findById(user_id, true);
      if (user?.isAdmin) {
        return true;
      }
    }

    const user_role = await this.domainService.getRole(user_id, domain_id);
    if (!user_role) {
      return false;
    }

    for (const role of roles) {
      if (user_role == role) return true;
    }
    return false;
  }
}
