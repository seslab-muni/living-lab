import Typography from '@mui/material/Typography';
import * as React from 'react';
import { RegisterForm } from '../components';
import CenterCardLayout from '../components/CenterCardLayout';

export default function RegisterPage() {
  return (
    <CenterCardLayout>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        BVV Living Lab Registration
      </Typography>
      <RegisterForm />
    </CenterCardLayout>
  );
}
