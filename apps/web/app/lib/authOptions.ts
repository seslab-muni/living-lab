import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { BACKEND_URL } from './constants';
import { refreshAccessToken } from './auth';
import { JWT } from 'next-auth/jwt';
import { jwtDecode } from 'jwt-decode';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };
        if (!email || !password) {
          return null;
        }
        const res = await fetch(BACKEND_URL + `/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) return null;

        const data = (await res.json()) as {
          accessToken: string;
          refreshToken: string;
          user: {
            id: string;
            name: string;
            isAdmin: boolean;
            roles: { domainId: string; role: string };
          };
        };

        const { exp } = jwtDecode<{ exp: number }>(data.accessToken);

        return {
          id: data.user.id,
          user: {
            id: data.user.id,
            name: data.user.name,
            isAdmin: data.user.isAdmin,
            roles: data.user.roles,
          },
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: Date.now() + exp * 1000,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        token.user = user.user;
        token.sub = user.user.id;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.expiresAt = user.expiresAt;
      }

      if (Date.now() < (token.expiresAt ?? 0)) return token;

      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      const t = token;
      session.user = {
        ...t.user,
        id: t.user?.id,
        name: t.user?.name,
        isAdmin: t.user?.isAdmin,
        roles: t.user?.roles,
      };
      session.accessToken = t.accessToken;
      session.refreshToken = t.refreshToken;
      session.expires = new Date(t.expiresAt).toISOString();
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signOut({ token }) {
      try {
        await fetch(BACKEND_URL + `/auth/logout`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token.accessToken}`,
          },
        });
      } catch (err) {
        console.error('Error revoking refresh token on signOut:', err);
      }
    },
  },
};

export default NextAuth(authOptions);
