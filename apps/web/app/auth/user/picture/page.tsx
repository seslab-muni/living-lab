'use client';
import { Box, Button, Typography } from '@mui/material';
import { WhiteTextField } from '../../../../components';
import React from 'react';

export default function Home() {
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

    if (formData.password.length < 8) {
      setError('The password needs to have at least 8 characters.');
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setError('');

    try {
      const response = await fetch('http://localhost:3001/auth/user/picture', {
        method: 'POST',
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
          Change your profile picture
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
          <div>
            <WhiteTextField
              required
              fullWidth
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              label="Current password"
              type="password"
              color="secondary"
            />
          </div>
          <div>
            <WhiteTextField
              required
              fullWidth
              name="password"
              value={formData.password}
              onChange={handleChange}
              label="Password"
              type="password"
              color="secondary"
            />
          </div>
          <div>
            <WhiteTextField
              required
              fullWidth
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              label="Password again"
              type="password"
              color="secondary"
            />
          </div>
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
