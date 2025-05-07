'use client';

import { Button, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import React from 'react';
import { BACKEND_URL } from '../lib/constants';
import DarkTextField from './DarkTextField';

export default function EmailInput() {
  const router = useRouter();
  const [emailData, setEmailData] = React.useState({
    email: '',
  });

  const [error, setError] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setEmailData({
      email: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailData.email.includes('@')) {
      setError('Email must contain @.');
      return;
    }
    try {
      const response = await fetch(BACKEND_URL + '/auth/email-exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (response.ok) {
        router.push('/password/change-password/' + data.id);
        return;
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.log('Error:', err);
      setError('Wrong code.');
    }
  };

  return (
    <div>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Give me an email to send the code for changing the password.
      </Typography>
      <Typography variant="body1" component="p" sx={{ mb: 2 }}>
        An email that is already registered in the platform.
      </Typography>
      <DarkTextField
        required
        fullWidth
        name="email"
        value={emailData.email}
        onChange={handleChange}
        label="Email"
      />
      <Typography variant="body1" component="p" sx={{ mb: 2 }} color="error">
        {error}
      </Typography>
      <Button onClick={handleSubmit}>Verify</Button>
    </div>
  );
}
