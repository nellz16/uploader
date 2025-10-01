import './globals.css';
import type { Metadata } from 'next';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'ZhivLux GitDeployer',
  description: 'The fastest way to deploy a ZIP to your GitHub repo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#111827] min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
