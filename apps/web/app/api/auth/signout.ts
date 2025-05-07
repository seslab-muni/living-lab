import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, Session } from 'next-auth';
import authOptions from '../../lib/authOptions';
import { BACKEND_URL } from '../../lib/constants';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Grab the NextAuth session (which includes our refreshToken)
  const session: Session | null = await getServerSession(req, res, authOptions);
  if (session?.refreshToken) {
    try {
      await fetch(BACKEND_URL + `/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    } catch (err) {
      console.error('Logout error:', err);
      // Possible to return 200 so the client clears its session
    }
  }

  return res.status(200).end();
}
