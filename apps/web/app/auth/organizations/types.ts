export interface OrganizationDto {
    id: number;
    name: string;
    description?: string;
    memberCount?: number;
    isMember: boolean;
}