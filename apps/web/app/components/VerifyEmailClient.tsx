'use client';

import Typography from '@mui/material/Typography';
import * as React from 'react';
import CenterCardLayout from './CenterCardLayout';
import { BACKEND_URL } from '../lib/constants';
import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import DarkTextField from './DarkTextField';
import { signIn } from 'next-auth/react';

export default function VerifyEmail({ id }: { id: string }) {
  const router = useRouter();
  const [codeData, setCodeData] = React.useState({
    token: '',
  });

  const [error, setError] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setCodeData({
      token: value,
    });
  };

  const getPendingCredentials = () => {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = sessionStorage.getItem('pendingRegistration');
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem('pendingRegistration');
    try {
      return JSON.parse(raw) as { email: string; password: string };
    } catch {
      return null;
    }
  };

  const getPostAuthRedirect = () => {
    if (typeof window === 'undefined') return null;
    const path = sessionStorage.getItem('postAuthRedirect');
    return path && path.startsWith('/') ? path : null;
  };

  const clearPostAuthRedirect = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('postAuthRedirect');
  };

  const clearPendingInvitationPath = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('pendingInvitationPath');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(BACKEND_URL + '/auth/verify/' + id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(codeData),
      });

      const data = await response.json();

      if (response.ok) {
        const creds = getPendingCredentials();
        const redirectPath = getPostAuthRedirect();
        if (creds) {
          const result = await signIn('credentials', {
            redirect: false,
            email: creds.email,
            password: creds.password,
          });
          if (!result?.error) {
            if (redirectPath) {
              clearPostAuthRedirect();
              clearPendingInvitationPath();
              router.push(redirectPath);
            } else {
              router.push('/auth');
            }
            return;
          }
        }

        if (redirectPath) {
          router.push(`/login?callbackUrl=${encodeURIComponent(redirectPath)}`);
        } else {
          router.push('/login');
        }
        return;
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Wrong token.');
    }
  };

  return (
    <CenterCardLayout>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Please check your inbox for a token, to confirm your email ♡.
      </Typography>
      <Typography variant="body1" component="p" sx={{ mb: 2 }}>
        If you don&apos;t see it, please check your spam folder.
      </Typography>
      <DarkTextField
        required
        fullWidth
        name="token"
        value={codeData.token}
        onChange={handleChange}
        label="token"
      />
      <Typography variant="body1" component="p" sx={{ mb: 2 }} color="error">
        {error}
      </Typography>
      <Button onClick={handleSubmit}>Verify</Button>
    </CenterCardLayout>
  );
}
