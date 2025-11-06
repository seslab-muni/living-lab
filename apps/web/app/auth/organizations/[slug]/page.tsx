'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Stack,
    Snackbar,
    Alert,
} from '@mui/material';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';
import type { JoinRequestDto } from '../types';
import NextLink from 'next/link';

export default function OrganizationDetailsPage() {
    const { slug } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
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
            } catch (err: any) {
                if (err instanceof Response && err.status === 404) {
                    setError('Organization not found.');
                } else if (typeof err?.message === 'string' && err.message.includes('404')) {
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
        authFetch(
            `${BACKEND_URL}/organizations/${org.slug}/join-requests`
        )
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

    if (org === null) {
        return (
            <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
            </Box>
        );
    }


    const handleLeave = async () => {
        try {
            const res = await authFetch(`${BACKEND_URL}/organizations/${slug}/leave`, {
                method: 'POST',
            });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            let msg =
              data?.message || `Failed to leave organization (HTTP ${res.status}).`;

            if (typeof msg === 'string' && msg.includes('{')) {
              try {
                const parsed = JSON.parse(msg.match(/\{.*\}$/)?.[0] || '{}');
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
            const match = err.message.match(/\{.*\}$/);
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
                        Organization alias and company ID: {org.organizationAlias} (IČO: {org.companyId})
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

                    {(userRole === 'Owner' || userRole === 'Admin' || userRole === 'Viewer' || userRole === 'Manager') && org.members.length > 0 && (
                      <Box mb={4}>
                        <Typography variant="h6" gutterBottom>
                          Members
                        </Typography>
                        <Box
                          component="ul"
                          sx={{
                            margin: 0,
                            padding: 0,
                            listStyleType: 'disc',
                            pl: 2,
                          }}
                        >
                          {org.members.map((m) => (
                            <Box
                              component="li"
                              key={m.id}
                              sx={{
                                marginBlockStart: 0,
                                marginBlockEnd: 0,
                                mb: 0.2,
                                '& > *': { margin: 0 },
                              }}
                            >
                              <Typography variant="body2">
                                {m.firstName} {m.lastName}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {(userRole === 'Owner' || userRole === 'Admin' || userRole === 'Manager') && (
                        <Box mb={4}>
                            <Typography variant="h6" gutterBottom>
                                Pending Join Requests
                            </Typography>

                            {requests === null ? (
                                <CircularProgress size={24} />
                            ) : requests.length === 0 ? (
                                <Typography>No new requests.</Typography>
                            ) : (
                                <Box
                                    component="ul"
                                    sx={{ m: 0, p: 0, listStyleType: 'disc' }}
                                >
                                    {requests.map((r) => (
                                        <Box
                                            component="li"
                                            key={r.id}
                                            sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                                        >
                                            <Typography sx={{ flexGrow: 1 }} variant="body2">
                                                {r.user.firstName} {r.user.lastName}
                                            </Typography>
                                            <Button
                                                size="small"
                                                component={NextLink}
                                                href={`/auth/organizations/${org.slug}/requests/${r.id}`}
                                            >
                                                Review
                                            </Button>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}

                    <Box display="flex" justifyContent="center" gap={2} mt={2}>
                      { (
                        isMember ? (
                          <Button variant="outlined" color="error" onClick={handleLeave}>
                            Leave
                          </Button>
                      ) : (
                          org.hasPendingRequest ? (
                            <Button variant="contained" disabled>
                              Request Sent
                            </Button>
                          ) : org.isPrivate ? (
                              <Button variant="contained" disabled>
                                Private Organization
                              </Button>
                          )  : (
                            <Button
                              component={NextLink}
                              href={`/auth/organizations/${slug}/join`}
                            >
                              Request to Join
                            </Button>
                            )
                          )
                        )}
                      {(userRole === 'Owner' || userRole === 'Manager' || userRole === 'Admin') && (
                        <Button variant="outlined" onClick={() => router.push(`/auth/organizations/${slug}/edit`)}>
                          Edit Organization
                        </Button>
                      )}
                    </Box>
                </Stack>
            </Box>
            <Snackbar
              open={showSaved}
              autoHideDuration={3000}
              onClose={() => setShowSaved(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setShowSaved(false)}
                severity="success"
                sx={{ width: '100%' }}
              >
                Changes saved successfully
              </Alert>
            </Snackbar>
            <Snackbar
                open={!!error}
                autoHideDuration={4000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
            <Snackbar
              open={snackbarOpen}
              autoHideDuration={4000}
              onClose={() => setSnackbarOpen(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setSnackbarOpen(false)}
                severity="error"
                sx={{ width: '100%' }}
              >
                {snackbarMessage}
              </Alert>
            </Snackbar>
        </Box>
    );
}