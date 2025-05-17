'use client';
import { styled, TextField, TextFieldProps } from '@mui/material';

const DarkTextField: React.ComponentType<TextFieldProps> = styled(
  TextField,
)<TextFieldProps>(({ theme }) => ({
  '& .MuiInputLabel-root': {
    color: theme.palette.grey[600],
  },
  // label when focused
  '& .MuiInputLabel-root.Mui-focused': {
    color: theme.palette.primary.main,
  },

  // the outlined border
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: theme.palette.grey[800], // visible grey when idle
    },
    '&:hover fieldset': {
      borderColor: theme.palette.grey[600], // darker grey on hover
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main, // purple on focus
    },
  },

  '& input:-webkit-autofill': {
    WebkitBoxShadow: `0 0 0 100px ${theme.palette.grey[900]} inset !important`,
    boxShadow: `0 0 0 100px ${theme.palette.grey[900]} inset !important`,
    WebkitTextFillColor: '#fff !important',
  },

  // the actual input text
  '& .MuiInputBase-input': {
    color: '#fff',
  },
}));

export default DarkTextField;
