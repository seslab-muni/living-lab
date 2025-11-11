'use client';

import Typography from '@mui/material/Typography';
import { Suspense } from 'react';
import { LoginForm } from '../components';
import CenterCardLayout from '../components/CenterCardLayout';

export default function LoginPage() {
  return (
    <CenterCardLayout>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        BVV Living Lab Login
      </Typography>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </CenterCardLayout>
  );
}
