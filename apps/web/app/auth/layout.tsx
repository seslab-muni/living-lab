import * as React from 'react';
import TopMenu from '../../components/TopMenu';
import { Box } from '@mui/material';

export default function AuthLayout(props: { children: React.ReactNode }) {
  return (
    <>
      <TopMenu></TopMenu>
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          bgcolor: '#FAF9F6',
          color: '#000',
          py: 6,
        }}
      >
        {props.children}
      </Box>
    </>
  );
}
