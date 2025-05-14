// apps/web/app/auth/organizations/components/OrganizationCard.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, CardActions, Box } from '@mui/material';
import NextLink from 'next/link';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';

export default function OrganizationCard({ org }: { org: OrganizationDto }) {
//  const [isMember, setIsMember] = useState<boolean>(!!org.isMember); will add when API is done
  const [isMember, setIsMember] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    setError(null);
    authFetch(`${BACKEND_URL}/organizations/${org.id}/join`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setIsMember(true);
      })
      .catch(err => setError(err.message));
  };

  const handleLeave = () => {
    setError(null);
    authFetch(`${BACKEND_URL}/organizations/${org.id}/leave`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setIsMember(false);
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
        {typeof org.memberCount === 'number' && (
          <Typography variant="caption" color="text.secondary">
            Members: {org.memberCount}
          </Typography>
        )}
      </CardContent>

      {error && (
        <Box sx={{ px: 2 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <CardActions sx={{ justifyContent: 'space-between' }}>
        {isMember ? (
          <Button variant="outlined" color="error" onClick={handleLeave}>
            Leave
          </Button>
        ) : (
          <Button variant="contained" onClick={handleJoin}>
            Join
          </Button>
        )}
        <Button component={NextLink} href={`/auth/organizations/${org.id}`} size="small">
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
