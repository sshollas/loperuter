import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Løperuter Oslo',
  description: 'Rundturer og A→B med forhåndsbygd graf',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
