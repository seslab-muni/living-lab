'use client';

import React from 'react';
import { BACKEND_URL } from '../../../lib/constants';
import { Box, Button, TextField, Typography } from '@mui/material';
import { authFetch } from '../../../lib/auth';
import FeedbackMessage from '../../../components/FeedbackMessage';

export default function EditUser() {
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
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
    setError('');

    try {
      const response = await authFetch(BACKEND_URL + '/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setOk(
          'Name changed successfully! \n The appbar will change with next login..',
        );
      } else {
        setError(data.message || 'Name change failed.');
      }
    } catch (err: unknown) {
      console.error('Error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
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
        <Typography variant="h2" textAlign="left">
          Change your name for this platform
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
            fullWidth
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            label="First name"
          />
          <TextField
            fullWidth
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            label="Last Name"
          />
        </Box>
        <Box display="flex" alignItems="flex-end">
          <FeedbackMessage error={error} ok={ok} />
          <Button type="submit" sx={{ ml: 2 }}>
            change
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
