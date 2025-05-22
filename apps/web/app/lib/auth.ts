import { JWT } from 'next-auth/jwt';
import { jwtDecode } from 'jwt-decode';
import { getSession } from 'next-auth/react';
import { BACKEND_URL, FRONTEND_URL } from './constants';
import { Roles } from '../../types/next-auth';

export const refreshAccessToken = async (jwt: JWT) => {
  try {
    const res = await fetch(BACKEND_URL + '/auth/refresh', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt.refreshToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = (await res.json()) as {
      user: {
        id: string;
        name: string;
        isAdmin: boolean;
        roles: { domainId: string; role: Roles }[];
      };
      accessToken: string;
      refreshToken: string;
    };
    const { exp } = jwtDecode<{ exp: number }>(data.accessToken);
    return {
      user: {
        id: data.user.id,
        name: data.user.name,
        isAdmin: data.user.isAdmin,
        roles: data.user.roles,
      },
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: exp * 1000,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

export async function authFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  await getSession();
  const { accessToken } = (await getSession()) || {};
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.assign(`${FRONTEND_URL}/login`);
      }
    }
    throw new Error(`Fetch error ${res.status}: ${await res.text()}`);
  }
  return res;
}
