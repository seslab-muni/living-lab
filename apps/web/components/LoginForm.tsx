import * as React from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { BACKEND_URL, FRONTEND_URL } from '../app/lib/constants';

export default function RegisterForm() {
    const router = useRouter();  
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
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

    if (!formData.email || !formData.password) {
      setError('Please fill all the slots.');
      return;
    }
    setError('');

    try {
      const response = await fetch(BACKEND_URL + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(FRONTEND_URL + 'auth/home')
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
      {error && (
        <div style={{ color: 'red', margin: 1.8 }}>
          {error}
        </div>
      )}
      <div style={{margin: 20}}>
        <Button
          type="submit">
          login
        </Button>
      </div>
      <Box>
        <Typography component={NextLink} href={`/password`} sx={{ mr: 2, color: "primary.main" }}>
          I have forgotten my password.
        </Typography>
      </Box>
    </Box>
  );
}