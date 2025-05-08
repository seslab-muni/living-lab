'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { BACKEND_URL } from '../lib/constants';
import { Box, Button } from '@mui/material';
import CenterCardLayout from './CenterCardLayout';
import DarkTextField from './DarkTextField';

export default function ChangePasswordClient({ id }: { id: string }) {
  const router = useRouter();
  const [formData, setFormData] = React.useState({
    code: '',
    password: '',
    passwordConfirm: '',
  });

  const [error, setError] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.passwordConfirm || !formData.password) {
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
      const response = await fetch(
        BACKEND_URL + '/auth/change-password/' + id,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (response.ok) {
        router.push(`/login`);
        return;
      } else {
        setError(data.message || "Password could'nt be changed failed.");
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Server error. Try again later.');
    }
  };

  return (
    <CenterCardLayout>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ '& .MuiTextField-root': { m: 1.8, width: '40ch' } }}
        autoComplete="off"
        justifyItems={'center'}
      >
        <div>
          <DarkTextField
            required
            fullWidth
            name="code"
            value={formData.code}
            onChange={handleChange}
            label="Code"
          />
        </div>
        <div>
          <DarkTextField
            required
            fullWidth
            name="password"
            value={formData.password}
            onChange={handleChange}
            label="New password"
            type="password"
          />
        </div>
        <div>
          <DarkTextField
            required
            fullWidth
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handleChange}
            label="New password again"
            type="password"
          />
        </div>
        {error && <div style={{ color: 'red', margin: 1.8 }}>{error}</div>}
        <div style={{ margin: 20 }}>
          <Button type="submit">Change password</Button>
        </div>
      </Box>
    </CenterCardLayout>
  );
}
