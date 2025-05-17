export class OrganizationDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  companyId: number;
  companyName: string;
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
}
