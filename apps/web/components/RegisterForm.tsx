'use client'

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { BACKEND_URL } from '../app/lib/constants';

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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill all the slots.');
      return;
    }
    if (!formData.email.includes('@')) {
      setError('Email must contain @.');
      return;
    }
    if (formData.password.length < 8) {
      setError('The password needs to have at least 8 characters and 1 uppercase letter.');
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
      const response = await fetch((BACKEND_URL + '/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {        
        router.push(`/email-confirmation`);
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
      justifyItems={"center"}
    >
      <div>
        <TextField
          required
          fullWidth
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          label="First name"
          placeholder="Jan"
        />
      </div>
      <div>
        <TextField
          required
          fullWidth
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          label="Last name"
          placeholder="Novák"
        />
      </div>
      <div>
        <TextField
          required
          fullWidth
          name="email"
          value={formData.email}
          onChange={handleChange}
          label="Email"
          type="email"
          placeholder="jan.novak@bvv.cz"
        />
      </div>
      <div>
        <TextField
          required
          fullWidth
          name="password"
          value={formData.password}
          onChange={handleChange}
          label="Password"
          type="password"
        />
      </div>
      <div>
        <TextField
          required
          fullWidth
          name="passwordConfirm"
          value={formData.passwordConfirm}
          onChange={handleChange}
          label="Password again"
          type="password"
        />
      </div>
      <div>
        <FormControlLabel
          control={
            <Checkbox
              name="agree"
              checked={formData.agree}
              onChange={handleChange}
            />
          }
          label="I agree with the Terms of Use."
        />
      </div>
      {error && (
        <div style={{ color: 'red', margin: 1.8 }}>
          {error}
        </div>
      )}
      <div style={{margin: 20}}>
        <Button
          type="submit">
          Register
        </Button>
      </div>
    </Box>
  );
}