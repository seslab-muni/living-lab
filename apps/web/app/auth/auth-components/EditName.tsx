'use client';

import React from 'react';
import { BACKEND_URL } from '../../lib/constants';
import { Box, Button, TextField, Typography } from '@mui/material';

export default function EditName() {
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
      const response = await fetch(BACKEND_URL + '/user/name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setOk('Name changed successfully!');
      } else {
        setError(data.message || 'Name change failed.');
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
          <div>
            <TextField
              fullWidth
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              label="First name"
            />
          </div>
          <div>
            <TextField
              fullWidth
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              label="Last Name"
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
