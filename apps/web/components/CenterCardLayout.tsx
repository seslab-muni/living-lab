import * as React from "react";
import { Box, CssBaseline } from "@mui/material";

export default function CenterCardLayout(props: { children: React.ReactNode }) {
  return (
    <Box
      height="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      bgcolor="primary.main"
    >
      <CssBaseline />
      <Box
        width={560}
        p={4}
        bgcolor="background.paper"
        borderRadius="16px"
        boxShadow={3}
        textAlign="center"
      >
        {props.children}
      </Box>
    </Box>
  );
}
