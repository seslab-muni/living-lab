import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';

@Injectable()
export class OrganizationMiddleware implements NestMiddleware {
  constructor(private readonly organizationService: OrganizationService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let idOrSlug = req.params.idOrSlug || req.params.domainId;

    if (!idOrSlug) {
      const match = req.path.match(/^\/organizations\/([^/]+)/);
      if (match) {
        idOrSlug = match[1];
      }
    }

    if (!idOrSlug) {
      return next();
    }

    if (!Number.isNaN(Number(idOrSlug))) {
      req.domainId = String(idOrSlug);
      return next();
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

    next();
  }
}
