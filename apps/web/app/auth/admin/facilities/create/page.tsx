'use client';

import React from 'react';
import { BACKEND_URL } from '../../../../lib/constants';
import { Box, Button, TextField, Typography } from '@mui/material';
import { authFetch } from '../../../../lib/auth';
import { FeedbackMessage } from '../../../../components';

export default function CreateFacility() {
  const [formData, setFormData] = React.useState({
    name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData({
      name: value,
    });
  };

  const [error, setError] = React.useState('');
  const [ok, setOk] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await authFetch(BACKEND_URL + '/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setOk('Facility created...');
      } else {
        setError("Facility could'nt be created.");
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
      <Box>
        <Typography variant="h3" textAlign="left">
          Create a facility
        </Typography>
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        width="100%"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        alignContent="end"
        gap={1}
      >
        <TextField
          fullWidth
          required
          name="name"
          value={formData.name}
          onChange={handleChange}
          label="Name"
        />
        <Box display="flex" alignItems="flex-end">
          <Button type="submit">create</Button>
          <FeedbackMessage error={error} ok={ok} />
        </Box>
      </Box>
    </Box>
  );
}
