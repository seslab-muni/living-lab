import authOptions from '../lib/authOptions';
import { getServerSession, Session } from 'next-auth';
import AuthLayoutClient from './auth-components/AuthLayoutClient';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await getServerSession(authOptions)) as Session;
  return <AuthLayoutClient session={session}>{children}</AuthLayoutClient>;
}
