import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationService } from '../organization.service';
import { Request } from 'express';

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(private readonly organizationService: OrganizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const idOrSlug = req.params.idOrSlug || req.params.domainId;

    if (!idOrSlug) {
      return true;
    }

    if (!Number.isNaN(Number(idOrSlug))) {
      req.domainId = String(idOrSlug);
      return true;
    }

    const id = await this.organizationService.findIdBySlug(idOrSlug);

    if (!id) {
      throw new NotFoundException(`Organization "${idOrSlug}" not found`);
    }

    req.domainId = String(id);

    if (req.params.idOrSlug) {
      req.params.idOrSlug = String(id);
    }
    if (req.params.domainId) {
      req.params.domainId = String(id);
    }

    return true;
  }
}
