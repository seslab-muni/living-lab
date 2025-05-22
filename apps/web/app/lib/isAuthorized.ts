import type { Roles } from '../../types/next-auth';
const ADMIN = 5;
const OWNER = 4;
const MANAGER = 3;
const MODERATOR = 2;
const VIEWER = 1;
export function isAuthorized(
  role: string,
  domainId: string,
  roles: { domainId: string; role: Roles }[],
) {
  const user_role =
    roles.find((r: { domainId: string }) => r.domainId === domainId)?.role ??
    '';
  let user_value = 0;
  switch (user_role) {
    case 'Admin': {
      user_value = ADMIN;
      break;
    }
    case 'Owner': {
      user_value = OWNER;
      break;
    }
    case 'Manager': {
      user_value = MANAGER;
      break;
    }
    case 'Moderator': {
      user_value = MODERATOR;
      break;
    }
    case 'Viewer': {
      user_value = VIEWER;
      break;
    }
  }
  let role_value = 0;
  switch (role) {
    case 'Admin': {
      role_value = ADMIN;
      break;
    }
    case 'Owner': {
      role_value = OWNER;
      break;
    }
    case 'Manager': {
      role_value = MANAGER;
      break;
    }
    case 'Moderator': {
      role_value = MODERATOR;
      break;
    }
    case 'Viewer': {
      role_value = VIEWER;
      break;
    }
  }
  return role_value <= user_value;
}
