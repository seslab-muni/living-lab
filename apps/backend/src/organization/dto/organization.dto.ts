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

  // ← new: full member list
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}
