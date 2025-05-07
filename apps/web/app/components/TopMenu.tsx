'use client';
import * as React from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AppBar, Button, Toolbar } from '@mui/material';
import GreyButton from './GreyButton';
import { signOut, useSession } from 'next-auth/react';

const pages = ['Organizations', 'Projects', 'Requirements', 'My tasks'];
function TopMenu() {
  const session = useSession();
  console.log('session', session);
  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: 'grey.900',
      }}
    >
      <Toolbar
        disableGutters
        sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/auth"
            sx={{
              mr: 4,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            BVV LL
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button
                component={NextLink}
                href={`/auth/${page.toLowerCase()}`}
                sx={{ mr: 2, color: 'white', display: 'block' }}
                key={page}
              >
                {page}
              </Button>
            ))}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box>
            <Typography
              component={NextLink}
              href={`/auth/user`}
              sx={{ mr: 2, color: 'primary.main', textDecoration: 'none' }}
            >
              {session.data?.user?.name}
            </Typography>
          </Box>
          <GreyButton
            onClick={() =>
              signOut({
                callbackUrl: '/login',
              })
            }
          >
            Sign out
          </GreyButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
export default TopMenu;
