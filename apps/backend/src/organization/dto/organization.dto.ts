export class OrganizationDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  companyId: number;
  companyName: string;
  isPrivate: boolean;
  createdAt: Date;
  lastEdit: Date;
  memberCount: number;
  isMember: boolean;
  hasPendingRequest: boolean;
  isOwner: boolean;
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  currentUserRole?:
    | 'Viewer'
    | 'Manager'
    | 'Owner'
    | 'Admin'
    | 'Moderator'
    | null;
  isAdmin?: boolean;
}
