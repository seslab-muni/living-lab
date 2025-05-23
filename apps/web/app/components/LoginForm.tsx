'use client';

import * as React from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { FRONTEND_URL } from '../lib/constants';
import DarkTextField from './DarkTextField';
import { signIn } from 'next-auth/react';

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
  });

  const [error, setError] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please fill all the slots.');
      return;
    }
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email: formData.email,
      password: formData.password,
    });

    if (res?.error) {
      console.error('Error:', res.error);
      if (!res) {
        setError('Server error');
      } else {
        setError('Wrong sign in credentials');
      }
    } else {
      router.push(FRONTEND_URL + '/auth');
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ '& .MuiTextField-root': { m: 1.8, width: '40ch' } }}
      autoComplete="off"
      justifyItems={'center'}
    >
      <DarkTextField
        required
        fullWidth
        name="email"
        value={formData.email}
        onChange={handleChange}
        label="Email"
        type="email"
        placeholder="jan.novak@bvv.cz"
      />
      <DarkTextField
        required
        fullWidth
        name="password"
        value={formData.password}
        onChange={handleChange}
        label="Password"
        type="password"
      />
      <Box>
        <Typography
          component={NextLink}
          href={`/password/input-email`}
          sx={{ mr: 2, color: 'secondary.main' }}
        >
          Forgot your password?
        </Typography>
      </Box>
      {error && (
        <Typography style={{ color: 'red', margin: 1.8 }}>{error}</Typography>
      )}
      <Box style={{ margin: 20 }}>
        <Button type="submit">login</Button>
      </Box>
      <Box display="flex" flexDirection="row">
        <Typography sx={{ mr: 2, color: 'primary.main' }}>
          Don&apos;t have an account?
        </Typography>
        <Typography
          component={NextLink}
          href={`/register`}
          sx={{ mr: 2, color: 'primary.main' }}
        >
          Sign up.
        </Typography>
      </Box>
    </Box>
  );
}
