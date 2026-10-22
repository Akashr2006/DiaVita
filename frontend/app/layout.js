import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'DiaVita – Smart Diabetes Lifestyle Companion',
  description: 'Track glucose, meals, activity and medicines. Get your DiaVita Score, eA1c and personalised lifestyle insights.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#85d1db',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-sm antialiased">{children}</body>
    </html>
  );
}
