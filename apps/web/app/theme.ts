'use client';
import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';
import { grey } from '@mui/material/colors';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E2DF29',
    },
    secondary: {
      main: '#86207B',
    },
    background: {
      default: '#FAF9F6',
    },
    grey,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // this applies your autofill override globally
        'input:-webkit-autofill, textarea:-webkit-autofill, select:-webkit-autofill':
          {
            WebkitBoxShadow: 'inset 0 0 0 1000px #FAF9F6 !important',
            WebkitTextFillColor: '#000 !important',
            transition:
              'background-color 5000s ease-in-out 0s, color 5000s ease-in-out 0s',
          },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          margin: '10px',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        color: 'secondary',
        variant: 'contained',
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          margin: '4px',
          color: 'secondary',
        },
      },
    },

    MuiOutlinedInput: {
      defaultProps: {
        color: 'secondary',
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused': {
            color: theme.palette.secondary.main, // focused label
          },
        }),
      },
    },
  },

  typography: {
    fontFamily: roboto.style.fontFamily,
  },
});

export default theme;
