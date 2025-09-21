import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Løperuter",
  description: "Planlegg smartere løperuter med stigningskontroll",
  icons: {
    icon: [
      {
        rel: "icon",
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
