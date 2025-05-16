import { Container, Toolbar } from '@mui/material';
import authOptions from '../lib/authOptions';
import { getServerSession, Session } from 'next-auth';
import AuthLayoutClient from './auth-components/AuthLayoutClient';
import TopMenu from './auth-components/TopMenu';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await getServerSession(authOptions)) as Session;
  return (
    <AuthLayoutClient session={session}>
      <TopMenu />
      <Container maxWidth="xl">
        <Toolbar />
        {children}
      </Container>
    </AuthLayoutClient>
  );
}
