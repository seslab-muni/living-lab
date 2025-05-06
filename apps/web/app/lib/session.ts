'use server';
import { UUID } from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type Session = {
  user: {
    id: UUID;
    name: string;
  };
  accessToken: string;
};
const privateKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(privateKey);

export async function createSession(data: Session) {
  // day in miliseconds
  const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);

  const session = await new SignJWT(data)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);

  (await cookies()).set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiredAt,
    sameSite: 'strict',
    path: '/',
  });
}

export async function getSession() {
  const cookie = (await cookies()).get('session')?.value;
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie, encodedKey, {
      algorithms: ['HS256'],
    });

    return payload as Session;
  } catch (err) {
    console.error('Failed to verify session', err);
    redirect('/login');
  }
}

export async function deleteSession() {
  (await cookies()).delete('session');
}
