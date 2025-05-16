'use client';

import { Box, Button, Divider, Typography } from '@mui/material';
import NextLink from 'next/link';
import Profile from './ProfilePic';
import theme from '../../../theme';
import { GreyButton } from '../../auth-components';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import { useEffect, useState } from 'react';

type MyData = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    isAdmin: boolean;
  };
};

export default function UserProfile() {
  const [data, setData] = useState<MyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch(BACKEND_URL + '/user/me')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: MyData) => {
        setData(json);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {});
  }, []);

  useEffect(() => {
    if (data) console.log('state data now:', data);
  }, [data]);
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
      p={{ sx: 4, md: 6 }}
    >
      <Box width="60%">
        <Typography variant="h3" textAlign="left">
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
        <Profile />
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
        <Typography variant="h4">
          {' '}
          <Divider color="#E2DF29" /> Organizations <br />
        </Typography>
        <Typography variant="subtitle1">
          {/* TBD */}
          BVV <br /> MUNI <br /> Mestsky urad <Divider color="#E2DF29" />
        </Typography>
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
          href={`/auth/user/update`}
          sx={{ margin: theme.spacing(2) }}
        >
          edit info
        </Button>
        <Button
          component={NextLink}
          href={`/auth/user/change-password`}
          sx={{ margin: theme.spacing(2) }}
        >
          change password
        </Button>
        {data?.user.isAdmin && (
          <GreyButton component={NextLink} href={`/auth/user/admin`}>
            admin site
          </GreyButton>
        )}
      </Box>
    </Box>
  );
}
