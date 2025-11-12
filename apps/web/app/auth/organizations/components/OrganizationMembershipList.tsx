'use client';

import { Box, Typography } from '@mui/material';
import type { OrganizationDto } from '../types';

type Props = {
  members: OrganizationDto['members'];
  canView: boolean;
};

export default function OrganizationMembershipList({
  members,
  canView,
}: Props) {
  if (!canView || members.length === 0) return null;

  return (
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
        {members.map((member) => (
          <Box
            component="li"
            key={member.id}
            sx={{
              marginBlockStart: 0,
              marginBlockEnd: 0,
              mb: 0.2,
              '& > *': { margin: 0 },
            }}
          >
            <Typography variant="body2">
              {member.firstName} {member.lastName}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
