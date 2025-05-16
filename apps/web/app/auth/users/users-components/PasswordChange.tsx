'use client';
import React from 'react';
import { BACKEND_URL } from '../../../lib/constants';
import { Box, Button, TextField, Typography } from '@mui/material';
import { authFetch } from '../../../lib/auth';

export default function PasswordChange() {
  const [formData, setFormData] = React.useState({
    oldPassword: '',
    password: '',
    passwordConfirm: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [error, setError] = React.useState('');
  const [ok, setOk] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.password ||
      !formData.oldPassword ||
      !formData.passwordConfirm
    ) {
      setError('Please fill all the slots.');
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

    setError('');

    try {
      const response = await authFetch(BACKEND_URL + '/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setOk('Password changed successfully!');
      } else {
        setError(data.message || 'Password change failed.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Server error. Try again later.');
    }
  };

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
          Change your password
        </Typography>
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        width="60%"
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignContent="end"
      >
        <Box width="40%" display="flex" flexDirection="column" gap={3}>
          <TextField
            required
            fullWidth
            name="oldPassword"
            value={formData.oldPassword}
            onChange={handleChange}
            label="Current password"
            type="password"
          />
          <TextField
            required
            fullWidth
            name="password"
            value={formData.password}
            onChange={handleChange}
            label="Password"
            type="password"
          />
          <TextField
            required
            fullWidth
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handleChange}
            label="Password again"
            type="password"
          />
        </Box>
        <Box display="flex" alignItems="flex-end">
          {error && <div style={{ color: 'red', margin: 1.8 }}>{error}</div>}
          {ok && <div style={{ color: 'gray', margin: 1.8 }}>{ok}</div>}
          <Button type="submit">change</Button>
        </Box>
      </Box>
    </Box>
  );
}
