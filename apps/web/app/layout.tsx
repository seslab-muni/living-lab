import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import type { Metadata } from "next";
import * as React from "react";
import theme from "./theme";
import { CssBaseline } from "@mui/material";

export const metadata: Metadata = {
  title: "BVV Living Lab platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
        <body>
          <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <ThemeProvider theme={theme}>
              <CssBaseline>
              {children}
              </CssBaseline>
            </ThemeProvider>
          </AppRouterCacheProvider>
        </body>
    </html>
  );
}