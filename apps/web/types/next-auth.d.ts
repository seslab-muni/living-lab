import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface User extends DefaultUser {
    user: { id: string; name: string, isAdmin: boolean, roles: {domainId: string, role: Roles} };
    accessToken: string
    refreshToken: string
    expiresAt: number
  }

  interface Session extends DefaultSession {
    user: { id: string; name: string, isAdmin: boolean, roles: {domainId: string, role: Roles} }
    accessToken: string
    refreshToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    user: { id: string; name: string, isAdmin: boolean, roles: {domainId: string, role: Roles} }
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
}
