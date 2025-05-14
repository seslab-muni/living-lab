import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../types/jwt-payload.interface';

// <unknown, JwtPayload> means: no data input, and the factory returns JwtPayload
export const GetUser = createParamDecorator<unknown, JwtPayload>(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user as JwtPayload;
  },
);
