import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';

export default function RegisterForm() {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    password_repeat: '',
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

    if (!formData.name || !formData.email || !formData.password) {
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
    if (formData.password !== formData.password_repeat) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.agree) {
      setError('You must agree to continue.');
      return;
    }

    setError('');

    try {
      const response = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Here you can further handle the response, e.g. redirect or set a success message.
        console.log('Registration successful:', data.message);
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
          name="name"
          value={formData.name}
          onChange={handleChange}
          label="Full name"
          placeholder="Jan Novák"
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
          name="password_repeat"
          value={formData.password_repeat}
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
          label="I agree with the bla bla."
        />
      </div>
      {error && (
        <div style={{ color: 'red', margin: 1.8 }}>
          {error}
        </div>
      )}
      <div style={{margin: 20}}>
        <Button
          type="submit"
          variant="contained">
          Register
        </Button>
      </div>
    </Box>
  );
}