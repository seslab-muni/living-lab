'use client';
import {
  AppBar,
  Box,
  CircularProgress,
  Divider,
  Toolbar,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { authFetch } from '../../lib/auth';
import { BACKEND_URL } from '../../lib/constants';
import { FeedbackMessage } from '../../components';

export default function FacilitiesPage() {
  const [data, setData] = useState<{ id: string; name: string }[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch(BACKEND_URL + '/facilities/')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: { id: string; name: string }[]) => {
        setData(json);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {});
  }, []);

  return (
    <>
      <Toolbar />

      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        width={{
          xs: '95%',
          sm: '85%',
          md: '70%',
          lg: '60%',
          xl: '50%',
        }}
        mx="auto"
      >
        <Typography variant="h2" gutterBottom>
          Facilities
        </Typography>

        <FeedbackMessage error={error} />

        <Divider sx={{ width: '100%', mb: 2 }} />

        {!data ? (
          <CircularProgress />
        ) : (
          <Box width="100%">
            {data.map(({ id, name }) => (
              <AppBar
                key={id}
                component={NextLink}
                href={`/auth/facilities/${id}`}
                position="static"
                color="default"
                sx={{
                  backgroundColor: 'theme.background',
                  textDecoration: 'none',
                }}
              >
                <Toolbar variant="dense">
                  <Typography
                    variant="subtitle2"
                    component="div"
                    sx={{
                      textDecoration: 'none',
                    }}
                  >
                    {name}
                  </Typography>
                </Toolbar>
              </AppBar>
            ))}
          </Box>
        )}
      </Box>
    </>
  );
}
