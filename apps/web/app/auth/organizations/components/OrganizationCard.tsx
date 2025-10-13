'use client';

import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, CardActions, Box } from '@mui/material';
import NextLink from 'next/link';
import type { OrganizationDto } from '../types';

export default function OrganizationCard({
  org,
}: {
  org: OrganizationDto;
  onMembershipChange?: (
    id: number,
    isMember: boolean,
    memberCount: number,
  ) => void;
}) {
  const [memberCount] = useState<number>(org.memberCount);
  const [error] = useState<string | null>(null);

  return (
    <Card
      elevation={3}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          {org.name}
          {org.isPrivate && (
            <Typography
              variant="caption"
              sx={{
                px: 0.8,
                py: 0.3,
                backgroundColor: '#eee',
                borderRadius: 1,
              }}
            >
              Private
            </Typography>
          )}
        </Typography>
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

      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button
          component={NextLink}
          href={`/auth/organizations/${org.slug}`}
          size="small"
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
