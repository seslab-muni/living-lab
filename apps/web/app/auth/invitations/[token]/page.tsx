'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BACKEND_URL } from '../../../lib/constants';
import { getSession } from 'next-auth/react';

export default function InvitationHandler() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [message, setMessage] = useState('Accepting your invitation...');
  const [error, setError] = useState(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) {
      return;
    }
    if (!token) {
      setError(true);
      setMessage('Invalid invitation link.');
      return;
    }
    const invitationPath = `/auth/invitations/${token}`;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingInvitationPath', invitationPath);
      sessionStorage.setItem('postAuthRedirect', invitationPath);
    }

    (async () => {
      attemptedRef.current = true;
      try {
        const session = await getSession();
        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (session?.accessToken) {
          headers.set('Authorization', `Bearer ${session.accessToken}`);
        }
        const res = await fetch(
          `${BACKEND_URL}/organizations/invitations/accept`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ token }),
          },
        );

        if (res.status === 401) {
          setMessage('Redirecting to login...');
          router.push(
            `/login?callbackUrl=${encodeURIComponent(invitationPath)}`,
          );
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(true);
          setMessage(
            (data as { message?: string }).message ??
              'Invalid or expired invitation',
          );
          return;
        }

        const data = await res.json();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('pendingInvitationPath');
          sessionStorage.removeItem('postAuthRedirect');
        }
        setMessage(data.message);

        setTimeout(() => router.push(`/auth/organizations/${data.slug}`), 2200);
      } catch (err: unknown) {
        setError(true);
        let friendlyMessage = 'An unexpected error occurred.';

        if (err instanceof Error && err.message) {
          const msg = err.message ?? '';

          if (msg.includes('{') && msg.includes('"message"')) {
            try {
              const parsed = JSON.parse(
                msg.split('Fetch error')[1]?.trim() || '{}',
              ) as { message?: string };
              friendlyMessage = parsed.message ?? friendlyMessage;
            } catch {
              const match = msg.match(/"message":"([^"]+)"/);
              if (match) friendlyMessage = match[1] ?? friendlyMessage;
            }
          } else {
            friendlyMessage = msg ?? friendlyMessage;
          }
        }

        setMessage(friendlyMessage);
      }
    })();
  }, [router, token]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>{error ? 'Error' : 'Invitation in progress'}</h2>
      <p>{message}</p>
    </div>
  );
}
