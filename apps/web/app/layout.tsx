import { Metadata } from 'next';
import MuiProviders from './providers/MuiProviders';

export const metadata: Metadata = {
  title: 'BVV Living Lab platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>
        <MuiProviders>{children}</MuiProviders>
      </body>
    </html>
  );
}
