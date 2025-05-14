export interface JwtPayload {
  id: string;
  email?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}
