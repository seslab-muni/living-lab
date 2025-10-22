export interface OrganizationDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  companyId: number;
  companyName: string;
  lastEdit: string;
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
}

export interface JoinRequestDto {
  id: number;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}