'use client';

import { Box, Button, CircularProgress, Typography } from '@mui/material';
import NextLink from 'next/link';
import type { JoinRequestDto } from '../types';

type Props = {
  requests: JoinRequestDto[] | null;
  canManage: boolean;
  organizationSlug: string;
};

export default function JoinRequestQueue({
  requests,
  canManage,
  organizationSlug,
}: Props) {
  if (!canManage) return null;

  return (
    <Box mb={4}>
      <Typography variant="h6" gutterBottom>
        Pending Join Requests
      </Typography>

      {requests === null ? (
        <CircularProgress size={24} />
      ) : requests.length === 0 ? (
        <Typography>No new requests.</Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyleType: 'disc' }}>
          {requests.map((req) => (
            <Box
              component="li"
              key={req.id}
              sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
            >
              <Typography sx={{ flexGrow: 1 }} variant="body2">
                {req.user.firstName} {req.user.lastName}
              </Typography>
              <Button
                size="small"
                component={NextLink}
                href={`/auth/organizations/${organizationSlug}/requests/${req.id}`}
              >
                Review
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
