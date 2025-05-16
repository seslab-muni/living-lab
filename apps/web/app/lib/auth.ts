import { JWT } from 'next-auth/jwt';
import { jwtDecode } from 'jwt-decode';
import { getSession } from 'next-auth/react';
import { FRONTEND_URL } from './constants';

export const refreshAccessToken = async (jwt: JWT) => {
  try {
    const res = await fetch('/api/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt.refreshToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = (await res.json()) as {
      id: string;
      name: string;
      isAdmin: boolean;
      accessToken: string;
      refreshToken: string;
    };

    const { exp } = jwtDecode<{ exp: number }>(data.accessToken);

    return {
      user: { id: data.id, name: data.name, isAdmin: data.isAdmin },
      name: data.name,
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
  const session = await getSession();
  const token = session?.accessToken;
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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
