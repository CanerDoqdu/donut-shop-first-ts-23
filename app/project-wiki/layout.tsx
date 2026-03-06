import type { ReactNode } from 'react';
import { Inter, Fredoka } from 'next/font/google';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'optional',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '700'],
  display: 'optional',
});

export const metadata = {
  title: '🍩 Project Schema — Glazed & Sipped',
};

export default function WikiLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fredoka.variable}`}>
      <body className="overflow-hidden bg-[#0d1117]">{children}</body>
    </html>
  );
}
