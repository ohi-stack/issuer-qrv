'use client';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const login = pathname === '/login';
  if (login) return <main className='content'>{children}</main>;

  return <div className="shell"><Sidebar /><div className="main"><Topbar /> <main className="content">{children}</main></div></div>;
}
