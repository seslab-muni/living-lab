'use client';
import * as React from 'react';
import { Box } from '@mui/material';

export default function CenterCardLayout(props: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        bgcolor: 'primary.main',
        background: (theme) =>
          `linear-gradient(
         to bottom,
         ${theme.palette.primary.main} 0%,
         ${theme.palette.primary.main} 30%,
         ${theme.palette.grey[900]} 100%
       )`,
        py: 6,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 560,
          mx: 'auto',
          backgroundColor: 'grey.900',
          borderRadius: 2,
          boxShadow: 3,
          textAlign: 'center',
          color: '#FFFFFF',
          p: 4,
        }}
      >
        {props.children}
      </Box>
    </Box>
  );
}
