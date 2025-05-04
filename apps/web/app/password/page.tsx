'use client';
import { Box, Typography } from '@mui/material';

export default function Home() {
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
          Change your name
        </Typography>
      </Box>
      <Box
        width="60%"
        display="flex"
        flexDirection="row"
        justifyContent="left"
        gap={3}
      ></Box>
    </Box>
  );
}
