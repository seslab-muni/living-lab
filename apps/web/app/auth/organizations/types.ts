export interface OrganizationDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  companyId: number;
  companyName: string;
  lastEdit: string;
  memberCount: number;
  isMember: boolean;

  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}