'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, Typography, Button, CircularProgress, Stack } from '@mui/material';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';
import type { JoinRequestDto } from '../types';
import NextLink from 'next/link';
import OrganizationMembershipList from '../components/OrganizationMembershipList';
import JoinRequestQueue from '../components/JoinRequestQueue';
import SnackbarFeedback from '../components/SnackbarFeedback';

export default function OrganizationDetailsPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { status } = useSession();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [org, setOrg] = useState<OrganizationDto | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequestDto[] | null>(null);
  const searchParams = useSearchParams();
  const savedParam = searchParams.get('saved') === 'true';
  const [showSaved, setShowSaved] = useState(savedParam);
  const [userRole, setUserRole] = useState<
    'Viewer' | 'Manager' | 'Owner' | 'Admin' | 'Moderator' | null
  >(null);

  useEffect(() => {
    if (!savedParam) return;
    const timeout = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('saved');
      window.history.replaceState({}, '', url.toString());
    }, 3500);
    return () => clearTimeout(timeout);
  }, [savedParam]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const loadOrganization = async () => {
      try {
        const res = await authFetch(`${BACKEND_URL}/organizations/${slug}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError('Organization not found.');
          } else {
            setError(`Failed to load organization (HTTP ${res.status}).`);
          }
          setOrg(null);
          return;
        }

        const data: OrganizationDto = await res.json().catch(() => null);

        if (!data) {
          setError('Invalid response from server.');
          setOrg(null);
          return;
        }

        setOrg(data);
        setIsMember(data.isMember);
        setMemberCount(data.memberCount);
        setUserRole(data.currentUserRole ?? null);
      } catch (err: unknown) {
        if (err instanceof Response && err.status === 404) {
          setError('Organization not found.');
        } else if (err instanceof Error && err.message.includes('404')) {
          setError('Organization not found.');
        } else {
          setError('Unable to load request.');
        }
        setOrg(null);
      }
    };

    loadOrganization();
  }, [status, slug]);

  useEffect(() => {
    if (
      !org ||
      !['Owner', 'Manager', 'Admin'].includes(org.currentUserRole ?? '')
    )
      return;
    authFetch(`${BACKEND_URL}/organizations/${org.slug}/join-requests`)
      .then((res) => res.json())
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [org]);

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        mt={8}
        gap={2}
      >
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          The organization you are looking for doesn’t exist or has been
          archived.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => router.push('/auth/organizations')}
          sx={{ mt: 2 }}
        >
          Return to all organizations
        </Button>
      </Box>
    );
  }

  if (org === null) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const handleLeave = async () => {
    try {
      const res = await authFetch(
        `${BACKEND_URL}/organizations/${slug}/leave`,
        {
          method: 'POST',
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        let msg =
          data?.message || `Failed to leave organization (HTTP ${res.status}).`;

        if (typeof msg === 'string' && msg.includes('{')) {
          try {
            const parsed = JSON.parse(msg.match(/\{.*}$/)?.[0] || '{}');
            msg = parsed.message || msg;
          } catch {
            // ignore parse errors
          }
        }
        if (msg.includes('At least one Owner must remain')) {
          msg = 'You cannot leave as the only Owner of this organization.';
        }

        setSnackbarMessage(msg);
        setSnackbarOpen(true);
        return;
      }
      setIsMember(false);
      setMemberCount((c) => Math.max(c - 1, 0));
      setUserRole(null);
    } catch (err: unknown) {
      let msg = 'Network error while leaving organization.';
      if (err instanceof Error && err.message) {
        const match = err.message.match(/\{.*}$/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (parsed?.message) msg = parsed.message;
          } catch {
            // ignore parse errors
          }
        } else if (!err.message.startsWith('Fetch error')) {
          msg = err.message;
        }
      }
      if (msg.includes('At least one Owner must remain')) {
        msg = 'You cannot leave as the only Owner of this organization.';
      }

      setSnackbarMessage(msg);
      setSnackbarOpen(true);
    }
  };

  const canViewMembers =
    ['Owner', 'Admin', 'Viewer', 'Manager'].includes(userRole ?? '') &&
    org.members.length > 0;
  const canManageRequests = ['Owner', 'Manager', 'Admin'].includes(
    userRole ?? '',
  );

  return (
    <Box display="flex" justifyContent="center" p={{ xs: 4, md: 6 }}>
      <Box width={{ xs: '100%', md: '50%' }}>
        <Stack spacing={2}>
          <Typography variant="h4" textAlign="center">
            {org.name}
            {org.isPrivate && (
              <Typography
                variant="caption"
                sx={{
                  display: 'inline-block',
                  ml: 1,
                  px: 1,
                  py: 0.3,
                  backgroundColor: '#eee',
                  borderRadius: 1,
                }}
              >
                Private
              </Typography>
            )}
          </Typography>
          {userRole && (
            <Box
              sx={{
                display: 'inline-block',
                alignSelf: 'center',
                backgroundColor: '#eee',
                borderRadius: '8px',
                px: 1.2,
                py: 0.3,
                mt: 0.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Role: {userRole}
              </Typography>
            </Box>
          )}
          <Typography variant="body1">
            {org.description?.trim()
              ? org.description
              : 'No description provided.'}
          </Typography>
          <Box height={50}></Box>
          <Typography variant="caption" color="text.secondary">
            Organization alias and company ID: {org.organizationAlias} (IČO:{' '}
            {org.companyId})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date(org.lastEdit).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Creator of organization: {org.creatorName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Members: {memberCount}
          </Typography>

          <OrganizationMembershipList
            members={org.members}
            canView={canViewMembers}
          />

          <JoinRequestQueue
            requests={requests}
            canManage={canManageRequests}
            organizationSlug={org.slug}
          />

          <Box display="flex" justifyContent="center" gap={2} mt={2}>
            {isMember ? (
              <Button variant="outlined" color="error" onClick={handleLeave}>
                Leave
              </Button>
            ) : org.hasPendingRequest ? (
              <Button variant="contained" disabled>
                Request Sent
              </Button>
            ) : org.isPrivate ? (
              <Button variant="contained" disabled>
                Private Organization
              </Button>
            ) : (
              <Button
                component={NextLink}
                href={`/auth/organizations/${slug}/join`}
              >
                Request to Join
              </Button>
            )}
            {(userRole === 'Owner' ||
              userRole === 'Manager' ||
              userRole === 'Admin') && (
              <Button
                variant="outlined"
                onClick={() => router.push(`/auth/organizations/${slug}/edit`)}
              >
                Edit Organization
              </Button>
            )}
          </Box>
        </Stack>
      </Box>
      <SnackbarFeedback
        open={showSaved}
        message="Changes saved successfully"
        severity="success"
        autoHideDuration={3000}
        onClose={() => setShowSaved(false)}
      />
      <SnackbarFeedback
        open={!!error}
        message={error ?? ''}
        severity="error"
        onClose={() => setError(null)}
      />
      <SnackbarFeedback
        open={snackbarOpen}
        message={snackbarMessage}
        severity="error"
        onClose={() => setSnackbarOpen(false)}
      />
    </Box>
  );
}
