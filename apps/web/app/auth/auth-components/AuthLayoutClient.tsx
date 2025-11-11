'use client';

import { Container, Toolbar } from '@mui/material';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import TopMenu from './TopMenu';

export default function AuthLayoutClient({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <TopMenu />
      <Container maxWidth={false}>
        <Toolbar />
        {children}
      </Container>
    </SessionProvider>
  );
}
