import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Who Are You',
  description: 'Create a personalized website from a short SMS interview',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
