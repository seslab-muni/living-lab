import { styled, TextField, TextFieldProps } from '@mui/material';

const WhiteTextField: React.ComponentType<TextFieldProps> = styled(TextField)<TextFieldProps>(({ theme }) => ({
    "& .MuiInputLabel-root": {
    color: theme.palette.grey[600],
  },
  // label when focused
  "& .MuiInputLabel-root.Mui-focused": {
    color: theme.palette.secondary.main,
  },

  // the outlined border
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: theme.palette.grey[400],  // visible grey when idle
    },
    "&:hover fieldset": {
      borderColor: theme.palette.grey[600],  // darker grey on hover
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.secondary.main, // purple on focus
    },
  },

  // the actual input text
  "& .MuiInputBase-input": {
    color: '#000',  // typically #000 on white
  },
  }));

  export default WhiteTextField