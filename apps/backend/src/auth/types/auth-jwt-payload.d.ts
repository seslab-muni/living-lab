export type AuthPayload = {
  sub: {
    id: string;
    name: string;
    isAdmin: boolean;
    roles: { domainId: string; role: Roles }[];
  };
};
