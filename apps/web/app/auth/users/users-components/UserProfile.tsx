'use client';

import { Box, Button, Divider, Typography } from '@mui/material';
import NextLink from 'next/link';
import ProfilePicture from './ProfilePicture';
import theme from '../../../theme';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import { useEffect, useState } from 'react';

type User = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    isAdmin: boolean;
  };
};

export default function UserProfile() {
  const [data, setData] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch(BACKEND_URL + '/users/me')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: User) => {
        setData(json);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {});
  }, []);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
      p={{ sx: 4, md: 6 }}
    >
      <Box width="60%">
        <Typography variant="h2" textAlign="left">
          My profile
        </Typography>
      </Box>
      <Box
        width="60%"
        display="flex"
        flexDirection="row"
        justifyContent="left"
        gap={3}
      >
        <ProfilePicture />
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
          p={3}
        >
          <Typography variant="h4">
            {!data ? 'Loading...' : (data.user.firstName ?? 'First Name')}
          </Typography>
          <Typography variant="h4">
            {!data ? 'Loading...' : (data.user.lastName ?? 'Last name')}
          </Typography>
          <Typography variant="h4">
            {!data ? 'Loading...' : (data.user.email ?? 'Email')}
          </Typography>
          {error && <Typography variant="body1">{error}</Typography>}
        </Box>
      </Box>
      <Box width="60%" display="flex" flexDirection="column" gap={2}>
        <Divider />
        <Typography variant="h4" sx={{ my: 1 }}>
          Organizations
        </Typography>
        <Typography variant="subtitle1" sx={{ my: 1 }}>
          T<br />B<br />D
        </Typography>
        <Divider />
      </Box>
      <Box
        width="60%"
        display="flex"
        flexDirection="row"
        justifyContent="left"
        gap={2}
      >
        <Button
          component={NextLink}
          href={`/auth/users/update`}
          sx={{ margin: theme.spacing(2) }}
        >
          edit info
        </Button>
        <Button
          component={NextLink}
          href={`/auth/users/change-password`}
          sx={{ margin: theme.spacing(2) }}
        >
          change password
        </Button>
      </Box>
    </Box>
  );
}
