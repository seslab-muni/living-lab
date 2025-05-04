'use client';
import { Box, Button, Divider, Typography } from '@mui/material';
import { Profile } from '../../../components';

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
          <Typography variant="h4">firstName</Typography>
          <Typography variant="h4">lastName</Typography>
          <Typography variant="h4">email</Typography>
        </Box>
      </Box>
      <Box width="60%" display="flex" flexDirection="column" gap={2}>
        <Typography variant="h4">
          {' '}
          <Divider color="#E2DF29" /> Organizations <br />
        </Typography>
        <Typography variant="subtitle1">
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
        <Button>change picture</Button>
        <Button>change name</Button>
        <Button>change password</Button>
        <Button>Admin menu</Button>
      </Box>
    </Box>
  );
}
