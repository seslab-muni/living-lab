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
                const res = await authFetch(`${BACKEND_URL}/organizations/invitations/accept`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.message || 'Invalid or expired invitation');
                }

                const data = await res.json();
                setMessage(data.message);

                setTimeout(() => router.push(`/auth/organizations/${data.slug}`), 2200);
            } catch (err: any) {
                console.error(err);
                setError(true);
                let friendlyMessage = 'An unexpected error occurred.';
                if (err?.message?.includes('{') && err?.message?.includes('"message"')) {
                    try {
                        const parsed = JSON.parse(err.message.split('Fetch error')[1]?.trim() || '{}');
                        friendlyMessage = parsed.message || friendlyMessage;
                    } catch {
                        const match = err.message.match(/"message":"([^"]+)"/);
                        if (match) friendlyMessage = match[1];
                    }
                }
                else if (err instanceof Error && err.message) {
                    friendlyMessage = err.message;
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