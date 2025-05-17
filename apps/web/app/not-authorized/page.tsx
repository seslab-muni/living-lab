import { Box, Typography } from '@mui/material';

export default function NotAuthorizedPage() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
      p={{ sx: 4, md: 6 }}
    >
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Sorry! <br /> You can&apos;t access this page.
      </Typography>
    </Box>
  );
}
