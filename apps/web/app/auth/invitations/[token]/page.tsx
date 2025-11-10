'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';

export default function InvitationHandler() {
  const router = useRouter();
  const { token } = useParams();
  const [message, setMessage] = useState('Accepting your invitation...');
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(
          `${BACKEND_URL}/organizations/invitations/accept`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          },
        );

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
