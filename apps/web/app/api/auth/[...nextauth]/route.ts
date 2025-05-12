import NextAuth from 'next-auth';
import { authOptions } from '../../../lib/authOptions'; // wherever you exported it

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
