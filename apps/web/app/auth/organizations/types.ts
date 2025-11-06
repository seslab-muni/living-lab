export interface OrganizationDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  companyId: string;
  organizationAlias: string;
  lastEdit: string;
  modifiedBy?: string;
  memberCount: number;
  isMember: boolean;
  hasPendingRequest: boolean;
  isPrivate: boolean;
  isOwner: boolean;
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
  }>;
  currentUserRole?: 'Viewer' | 'Manager' | 'Owner' | 'Admin' | null;
  isAdmin?: boolean;
  currentUserId?: string;
}

export interface JoinRequestDto {
  id: number;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  modifiedAt?: Date;
  modifiedBy?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}