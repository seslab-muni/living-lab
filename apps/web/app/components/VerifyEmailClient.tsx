'use client';

import Typography from '@mui/material/Typography';
import * as React from 'react';
import CenterCardLayout from './CenterCardLayout';
import { BACKEND_URL } from '../lib/constants';
import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import DarkTextField from './DarkTextField';

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
        router.push('/login');
        return;
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.log('Error:', err);
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
