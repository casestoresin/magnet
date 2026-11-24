'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/api';

export default function TopNav() {
  const path = usePathname();
  return (
    <header className="topnav">
      <Link href="/" className="brand">
        🧲 Magnet Studio
      </Link>
      <nav>
        <Link href="/" className={path === '/' ? 'active' : ''}>
          Projects
        </Link>
        <Link href="/photos" className={path === '/photos' ? 'active' : ''}>
          Photo library
        </Link>
      </nav>
      <div className="spacer" />
      <button className="btn ghost sm" onClick={logout}>
        Logout
      </button>
    </header>
  );
}
