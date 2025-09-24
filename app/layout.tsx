import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Løperuter Planner',
  description: 'Planlegg løperuter med variasjon i distanse og stigning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
