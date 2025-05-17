'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Stack,
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

    const [org, setOrg] = useState<OrganizationDto | null>(null);
    const [isMember, setIsMember] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [requests, setRequests] = useState<JoinRequestDto[] | null>(null);

    useEffect(() => {
      if (status !== 'authenticated') return;

      authFetch(`${BACKEND_URL}/organizations/${slug}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: OrganizationDto) => {
          setOrg(data);
          setIsMember(data.isMember);
          setMemberCount(data.memberCount);
        })
        .catch(err => setError(err.message));
    }, [status, session, slug]);

    useEffect(() => {
        if (!org?.isOwner) return;
        authFetch(
            `${BACKEND_URL}/organizations/${org.slug}/join-requests`
        )
            .then((res) => res.json())
            .then(setRequests)
            .catch(() => setRequests([]));
    }, [org]);

  if (status === 'loading' || org === null) {
      return (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box textAlign="center" mt={4}>
          <Typography color="error">Error: {error}</Typography>
        </Box>
      );
    }

    const handleLeave = () => {
        authFetch(`${BACKEND_URL}/organizations/${slug}/leave`, { method: 'POST' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setIsMember(false);
                setMemberCount(c => Math.max(c - 1, 0));
            })
            .catch(err => setError(err.message));
    };

    return (
        <Box display="flex" justifyContent="center" p={{ xs: 4, md: 6 }}>
            <Box width={{ xs: '100%', md: '50%' }}>
                <Stack spacing={2}>
                    <Typography variant="h4" textAlign="center">
                        {org.name}
                    </Typography>
                    <Typography variant="body1">{org.description}</Typography>
                    <Box height={50}></Box>
                    <Typography variant="caption" color="text.secondary">
                        Company: {org.companyName} (IČO: {org.companyId})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Last updated: {new Date(org.lastEdit).toLocaleString()}
                    </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Owner of organization: {org.ownerName}
                  </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Members: {memberCount}
                    </Typography>

                    {org.isOwner && org.members.length > 0 && (
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

                    {org.isOwner && (
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
                      {!org.isOwner && (
                        isMember ? (
                          <Button variant="outlined" color="error" onClick={handleLeave}>
                            Leave
                          </Button>
                      ) : (
                          org.hasPendingRequest ? (
                            <Button variant="contained" disabled>
                              Request Sent
                            </Button>
                          ) : (
                            <Button
                              component={NextLink}
                              href={`/auth/organizations/${slug}/join`}
                            >
                              Request to Join
                            </Button>
                            )
                          )
                        )}
                      {org.isOwner && (
                        <Button variant="outlined" onClick={() => router.push(`/auth/organizations/${slug}/edit`)}>
                          Edit Organization
                        </Button>
                      )}
                    </Box>
                </Stack>
            </Box>
        </Box>
    );
}