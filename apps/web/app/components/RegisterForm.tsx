'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { BACKEND_URL } from '../lib/constants';
import DarkTextField from './DarkTextField';
import { Typography } from '@mui/material';

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    agree: false,
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

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password
    ) {
      setError('Please fill all the slots.');
      return;
    }
    if (!formData.email.includes('@')) {
      setError('Email must contain @.');
      return;
    }
    if (
      formData.password.length < 8 ||
      !/\d/.test(formData.password) ||
      !/[a-z]/.test(formData.password) ||
      !/[A-Z]/.test(formData.password)
    ) {
      setError(
        'The password needs to have at least 8 characters, 1 uppercase and 1 lowercase character and a number.',
      );
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.agree) {
      setError('You must agree to continue.');
      return;
    }

    setError('');

    try {
      const response = await fetch(BACKEND_URL + '/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/verify-email/${data.id}`);
        return;
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Server error. Try again later.');
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
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
        label="First name"
        placeholder="Jan"
      />
      <DarkTextField
        required
        fullWidth
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
        label="Last name"
        placeholder="Novák"
      />
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
      <DarkTextField
        required
        fullWidth
        name="passwordConfirm"
        value={formData.passwordConfirm}
        onChange={handleChange}
        label="Password again"
        type="password"
      />
      <FormControlLabel
        control={
          <Checkbox
            name="agree"
            checked={formData.agree}
            onChange={handleChange}
            sx={{ color: 'primary.main' }}
          />
        }
        label="I agree with the Terms of Use."
      />
      {error && (
        <Typography style={{ color: 'red', margin: 1.8 }}>{error}</Typography>
      )}
      <Box style={{ margin: 20 }}>
        <Button type="submit">Register</Button>
      </Box>
    </Box>
  );
}
