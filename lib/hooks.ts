'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession } from './api';
import type { Session } from './types';

export function useSessionGuard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      const current = getSession();
      setSession(current);
      setReady(true);

      if (!current) {
        router.replace('/login');
      }
    };

    syncSession();
    window.addEventListener('storage', syncSession);
    window.addEventListener('agunriders-session', syncSession);

    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('agunriders-session', syncSession);
    };
  }, [router]);

  return { session, ready };
}
