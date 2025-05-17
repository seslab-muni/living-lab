import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import 'express';

// Extend Express Request interface to include domainId
declare module 'express' {
  interface Request {
    domainId?: string;
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.params.domainId) {
      req.domainId = req.params.domainId;
    }
    next();
  }
}
