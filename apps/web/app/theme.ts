"use client";
import { createTheme } from "@mui/material/styles";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#E2DF29",
    },
    secondary: {
      main: "#86207B",
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          margin: "10px",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        color: "secondary",
        variant: "contained",
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          margin: "4px",
        },
      },
    },
  },

  // only dark theme available at the moment
  // colorSchemes: { light: true, dark: true },
  // cssVariables: {
  //   colorSchemeSelector: "class",
  // },

  typography: {
    fontFamily: roboto.style.fontFamily,
  },
});

export default theme;
