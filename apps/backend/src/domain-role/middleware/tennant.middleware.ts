import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.domainId =
      req.params.organizationId ??
      req.params.projectId ??
      req.params.facilityId;
    console.log(req.domainId);
    next();
  }
}
