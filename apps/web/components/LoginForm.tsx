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
        // const result = 
        await response.json();
        // TODO: create a session
        router.push(FRONTEND_URL + '/auth')
      } else {
        setError(data.message || 'Login failed.');
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
      <Box>
        <Typography component={NextLink} href={`/password`} sx={{ mr: 2, color: "secondary.main" }}>
          Forgot your password?
        </Typography>
      </Box>
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
      <Box display="flex" flexDirection="row">
        <Typography sx={{ mr: 2, color: "primary.main" }}>
          Don&apos;t have an account?
        </Typography>
        <Typography component={NextLink} href={`/register`} sx={{ mr: 2, color: "primary.main" }}>
          Sign up.
        </Typography>
      </Box>
    </Box>
  );
}