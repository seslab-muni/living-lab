import { UserSummaryDto } from '../../user/dto/user-summary.dto';

export class OrganizationDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  companyId: string;
  organizationAlias: string;
  isPrivate: boolean;
  isActive: boolean;
  createdAt: Date;
  lastEdit: Date;
  modifiedBy?: string;
  memberCount: number;
  isMember: boolean;
  hasPendingRequest: boolean;
  isOwner: boolean;
  members: Array<UserSummaryDto>;
  currentUserRole?:
    | 'Viewer'
    | 'Moderator'
    | 'Manager'
    | 'Owner'
    | 'Admin'
    | null;
  isAdmin?: boolean;
  currentUserId?: string;
}
