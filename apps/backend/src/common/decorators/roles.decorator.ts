import { SetMetadata } from '@nestjs/common';
import { Roles } from '../types/roles';

export const ROLES_KEY = 'roles';
export const DefineRoles = (...roles: Roles[]) => SetMetadata(ROLES_KEY, roles);
