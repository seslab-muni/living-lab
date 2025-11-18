'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BACKEND_URL } from '../../../lib/constants';
import { getSession } from 'next-auth/react';

type InvitationSummary = {
  organization: { name: string; slug: string };
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Revoked';
  expiresAt: string;
  isExpired: boolean;
  alreadyMember: boolean;
};

export default function InvitationHandler() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<InvitationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const invitationPath = token ? `/auth/invitations/${token}` : '';

  const ensureSession = useCallback(async () => {
    const session = await getSession();
    if (!session) {
      setStatusMessage('Redirecting to login...');
      router.push(`/login?callbackUrl=${encodeURIComponent(invitationPath)}`);
      return null;
    }
    return session;
  }, [invitationPath, router]);

  const fetchInvitation = useCallback(async () => {
    if (!token) {
      setError('Invalid invitation link.');
      setLoading(false);
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingInvitationPath', invitationPath);
      sessionStorage.setItem('postAuthRedirect', invitationPath);
    }
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    const session = await ensureSession();
    if (!session) return;

    try {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (session.accessToken) {
        headers.set('Authorization', `Bearer ${session.accessToken}`);
      }
      const res = await fetch(
        `${BACKEND_URL}/organizations/invitations/${token}`,
        { headers },
      );
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(invitationPath)}`);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ??
            'Unable to load invitation details.',
        );
        setInvitation(null);
      } else {
        const data = (await res.json()) as InvitationSummary;
        setInvitation(data);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load invitation details.',
      );
    } finally {
      setLoading(false);
    }
  }, [ensureSession, invitationPath, router, token]);

  useEffect(() => {
    void fetchInvitation();
  }, [fetchInvitation]);

  const clearPendingStorage = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pendingInvitationPath');
      sessionStorage.removeItem('postAuthRedirect');
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    const session = await ensureSession();
    if (!session) {
      setActionLoading(false);
      return;
    }
    try {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (session.accessToken) {
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
        router.push(`/login?callbackUrl=${encodeURIComponent(invitationPath)}`);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ??
            'Failed to accept invitation.',
        );
        return;
      }

      const data = (await res.json()) as { message: string; slug: string };
      clearPendingStorage();
      setStatusMessage(data.message);
      setTimeout(() => {
        router.push(`/auth/organizations/${data.slug}`);
      }, 1800);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to accept invitation.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    const session = await ensureSession();
    if (!session) {
      setActionLoading(false);
      return;
    }
    try {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (session.accessToken) {
        headers.set('Authorization', `Bearer ${session.accessToken}`);
      }
      const res = await fetch(
        `${BACKEND_URL}/organizations/invitations/reject`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ token }),
        },
      );

      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(invitationPath)}`);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ??
            'Failed to reject invitation.',
        );
        return;
      }

      const data = (await res.json()) as { message: string };
      clearPendingStorage();
      setStatusMessage(data.message);
      setTimeout(() => {
        router.push('/auth/organizations');
      }, 1800);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to reject invitation.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const canRespond =
    invitation &&
    invitation.status === 'Pending' &&
    !invitation.isExpired &&
    !statusMessage;

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Organization Invitation</h2>
      {loading ? (
        <p>Loading invitation details…</p>
      ) : error ? (
        <>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchInvitation()}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#86207B',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
              boxShadow: '0px 3px 6px rgba(0,0,0,0.18)',
            }}
          >
            Try again
          </button>
        </>
      ) : !invitation ? (
        <p>Invitation not found.</p>
      ) : (
        <>
          <p>
            You have been invited to join{' '}
            <strong>{invitation.organization.name}</strong>.
          </p>
          <p>Status: {invitation.status}</p>
          {invitation.isExpired && (
            <p style={{ color: 'red' }}>This invitation has expired.</p>
          )}
          {invitation.alreadyMember && (
            <p>You are already a member of this organization.</p>
          )}
          {statusMessage && <p>{statusMessage}</p>}
          {!statusMessage && (
            <p>
              Invitation expires on{' '}
              {new Date(invitation.expiresAt).toLocaleString()}.
            </p>
          )}
          {canRespond ? (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#86207B',
                  color: '#fff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  minWidth: '160px',
                  boxShadow: actionLoading
                    ? 'inset 0 0 0 1000px rgba(0,0,0,0.05)'
                    : '0px 3px 6px rgba(0,0,0,0.18)',
                  opacity: actionLoading ? 0.8 : 1,
                }}
              >
                Accept Invitation
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '4px',
                  border: '1px solid #86207B',
                  backgroundColor: '#fff',
                  color: '#86207B',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  minWidth: '160px',
                  boxShadow: actionLoading
                    ? 'inset 0 0 0 1000px rgba(0,0,0,0.03)'
                    : '0px 3px 6px rgba(0,0,0,0.12)',
                  opacity: actionLoading ? 0.75 : 1,
                }}
              >
                Reject Invitation
              </button>
            </div>
          ) : (
            !statusMessage && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/auth/organizations/${invitation.organization.slug}`)
                }
              >
                Go to organization
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}
