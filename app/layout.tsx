import type { Metadata } from 'next';
import { Inter, Playfair_Display, Caveat } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-handwrite' });

export const metadata: Metadata = {
  title: 'Us — Just For Two',
  description: 'A private space for two.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} ${caveat.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
