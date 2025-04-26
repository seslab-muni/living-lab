import Typography from "@mui/material/Typography";
import * as React from 'react';
import CenterCardLayout from "../../components/CenterCardLayout";
export default function Home() {
  return (
    <CenterCardLayout>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Please check your inbox, to confirm your email ♡.
      </Typography>
    </CenterCardLayout>
  );
}
