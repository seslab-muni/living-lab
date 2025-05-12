'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import type { Session } from 'next-auth';

export default function AuthLayoutClient({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
