'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, Typography, Button, CardActions, Box } from '@mui/material';
import NextLink from 'next/link';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';

export default function OrganizationCard({ org, onMembershipChange }: { org: OrganizationDto, onMembershipChange?:
  (id: number, isMember: boolean, memberCount: number) => void; }) {
  const [isMember, setIsMember] = useState<boolean>(!!org.isMember);
  const { data: session, status } = useSession();
  const isOwner = status === 'authenticated' && session.user.id === org.ownerId;
  const [memberCount, setMemberCount] = useState<number>(org.memberCount);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    setError(null);
    authFetch(`${BACKEND_URL}/organizations/${org.id}/join`, { method: 'POST' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setIsMember(true);
          setMemberCount(count => count + 1);
          // notify parent after state setters
          onMembershipChange?.(org.id, true, org.memberCount + 1);
        })
        .catch(err => setError(err.message));
  };

  const handleLeave = () => {
    setError(null);
    authFetch(`${BACKEND_URL}/organizations/${org.id}/leave`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setIsMember(false);
        setMemberCount(count => Math.max(count - 1, 0));
        // notify parent after state setters
        onMembershipChange?.(org.id, false, Math.max(org.memberCount - 1, 0));
      })
      .catch(err => setError(err.message));
  };

  return (
    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>{org.name}</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {org.description ?? 'No description provided.'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Members: {memberCount}
        </Typography>
      </CardContent>

      {error && (
        <Box sx={{ px: 2 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <CardActions sx={{ justifyContent: 'space-between' }}>
        {status === 'authenticated' && !isOwner && (
          isMember ? (
            <Button variant="outlined" color="error" onClick={handleLeave}>
              Leave
            </Button>
          ) : (
            <Button variant="contained" onClick={handleJoin}>
              Join
            </Button>
          )
        )}
        <Button component={NextLink} href={`/auth/organizations/${org.id}`} size="small">
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
