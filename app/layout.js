import './globals.css';
import { GOOGLE_FONTS_URL } from '@/lib/text';

export const metadata = {
  title: 'Magnet Studio — Photo Fridge Magnet Designer',
  description: 'Design, lay out and print custom photo fridge magnets.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
