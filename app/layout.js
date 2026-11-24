import './globals.css';

export const metadata = {
  title: 'Magnet Studio — Photo Fridge Magnet Designer',
  description: 'Design, lay out and print custom photo fridge magnets.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
