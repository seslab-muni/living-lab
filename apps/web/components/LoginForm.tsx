import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

export default function RegisterForm() {
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
      const response = await fetch('http://localhost:3001/auth/login', {
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
          color="secondary"
          type="submit"
          variant="contained">
          login
        </Button>
      </div>
    </Box>
  );
}