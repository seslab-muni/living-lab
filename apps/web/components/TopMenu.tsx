'use client'
import * as React from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { AppBar, Avatar, Button, Toolbar } from '@mui/material';

const pages = ['Organizations', 'Projects', 'Requirements', 'My tasks'];
function TopMenu() {
  return (
    <AppBar position="static">
      <Toolbar disableGutters sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="/auth"
              sx={{
                mr: 4,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'primary.main',
                textDecoration: 'none',
              }}
            >
              BVV LL
            </Typography>
            <Box sx={{display: { xs: 'none', md: 'flex' } }}>
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
              <Typography component={NextLink}
                  href={`/auth/user`} sx={{ mr: 2, color: "primary.main", textDecoration: 'none' }}>
                firstName
              </Typography>
            </Box>
            <Box>
              <IconButton  sx={{ p: 0 }}>
                <Avatar alt="Remy Sharp" src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
    </AppBar>
  );
}
export default TopMenu;
