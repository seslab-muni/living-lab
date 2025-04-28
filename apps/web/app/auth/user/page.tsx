'use client'
import { Box, Typography } from "@mui/material";
import { Profile } from "../../../components";

export default function Home() {
  return (
    <Box
    display="flex"
    flexDirection="column"
    alignItems="center" 
    gap={2}
    p={{ sx: 4, md: 6}}            
    >
      <Box width="60%">
        <Typography variant="h3" textAlign="left">
          My profile
        </Typography>
      </Box>
      <Box width="60%" display="flex" flexDirection="row" justifyContent="left" gap={3}>
        <Profile />
        <Box display="flex" flexDirection="column" justifyContent="space-between" p={3}>
        <Typography variant="h4">firstName</Typography>
        <Typography variant="h4">lastName</Typography>
        <Typography variant="h4">email</Typography>
        </Box>
      </Box>
      <Box width="60%">
      

      </Box>
    </Box>
  );
}
