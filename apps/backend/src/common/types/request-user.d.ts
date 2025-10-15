export type RequestUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  roles: { domainId: string; role: Roles }[];
};
