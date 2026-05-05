'use client';

import clsx from 'clsx';
import { LayoutDashboard, LogOut, Map, UsersRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { clearSession, getSession } from '@/lib/api';
import { bnLabel, statusLabel } from '@/lib/i18n';
import type { Session } from '@/lib/types';

const links = [
  { href: '/dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { href: '/tours', label: 'ট্যুর', icon: Map },
  { href: '/members', label: 'মেম্বারস', icon: UsersRound, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const profileActive = pathname === '/profile' || pathname.startsWith('/profile/');

  useEffect(() => {
    const syncSession = () => setSessionState(getSession());
    syncSession();
    window.addEventListener('storage', syncSession);
    window.addEventListener('agunriders-session', syncSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('agunriders-session', syncSession);
    };
  }, []);

  function logout() {
    clearSession();
    router.push('/login');
  }

  if (isAuthPage) {
    return <main className="flex min-h-screen items-center justify-center px-4 py-10">{children}</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-3 py-3 sm:px-4 lg:justify-between">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 font-black text-ink">
            <Image
              alt="Agun Riders"
              className="h-12 w-12 rounded-xl border border-orange-200 object-cover shadow-sm ring-2 ring-white"
              height={48}
              priority
              src="/agun-riders-logo.png"
              width={48}
            />
            <span className="truncate text-lg tracking-normal">Agun Riders</span>
          </Link>

          <nav className="order-3 grid w-full grid-cols-2 gap-1 rounded-xl border border-line bg-slate-50/80 p-1 sm:flex sm:w-auto sm:flex-wrap sm:items-center lg:order-none">
            {links
              .filter((link) => !link.adminOnly || session?.user.role === 'ADMIN')
              .map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={clsx(
                      'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-center text-sm font-bold transition sm:px-3',
                      active ? 'bg-river text-white shadow-sm' : 'text-slate-700 hover:bg-white hover:text-river hover:shadow-sm',
                    )}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
          </nav>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {session ? (
              <>
                <Link
                  aria-current={profileActive ? 'page' : undefined}
                  className={clsx(
                    'max-w-[150px] rounded-xl border bg-white px-3 py-2 text-right text-sm shadow-sm transition hover:border-river hover:text-river sm:max-w-[220px]',
                    profileActive ? 'border-river ring-2 ring-teal-50' : 'border-line',
                  )}
                  href="/profile"
                  title="প্রোফাইল দেখুন"
                >
                  <p className="truncate font-bold leading-4">{session.user.name}</p>
                  <p className="mt-1 text-xs font-semibold text-river">{bnLabel(session.user.role, statusLabel)}</p>
                </Link>
                <button className="btn-secondary" type="button" onClick={logout} title="লগআউট">
                  <LogOut size={16} aria-hidden="true" />
                  লগআউট
                </button>
              </>
            ) : (
              <Link className="btn-primary" href="/login">
                লগইন
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7">{children}</main>
    </div>
  );
}
