'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession } from '@/lib/api';
import type { Session } from '@/lib/types';

const tabs = [
  { href: '', label: 'ওভারভিউ' },
  { href: '/members', label: 'মেম্বার' },
  { href: '/expenses', label: 'খরচ' },
  { href: '/loans', label: 'লোন' },
  { href: '/fuel', label: 'ফুয়েল' },
  { href: '/settlements', label: 'সেটেলমেন্ট' },
  { href: '/report', label: 'রিপোর্ট' },
];

export function TourTabs({ tourId }: { tourId: string }) {
  const pathname = usePathname();
  const base = `/tours/${tourId}`;
  const [session, setSession] = useState<Session | null>(null);
  const visibleTabs = session?.user.role === 'MEMBER' ? tabs.filter((tab) => tab.href === '/report') : tabs;

  useEffect(() => {
    const syncSession = () => setSession(getSession());
    syncSession();
    window.addEventListener('agunriders-session', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('agunriders-session', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  return (
    <div className="mb-5 rounded-xl border border-line bg-white/80 p-1 shadow-sm">
      <div className="grid gap-1 sm:flex sm:flex-wrap">
        {visibleTabs.map((tab) => {
          const href = `${base}${tab.href}`;
          const active = tab.href === '' ? pathname === base : pathname === href;

          return (
            <Link
              key={tab.href || 'overview'}
              href={href}
              className={clsx(
                'inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-semibold transition',
                active
                  ? 'bg-river text-white shadow-sm'
                  : 'text-slate-600 hover:bg-cyan-50 hover:text-river',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
