export type RequestUser = {
  id: string;
  name: string;
  isAdmin: boolean;
  roles: { domainId: string; role: Roles }[];
};
