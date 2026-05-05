'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, dateText, routeText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { Tour, User } from '@/lib/types';

export default function ProfilePage() {
  const { session, ready } = useSessionGuard();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<User>('/auth/profile'),
    enabled: ready && Boolean(session),
  });
  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: () => apiFetch<Tour[]>('/tours'),
    enabled: ready && Boolean(session),
  });

  if (!ready || !session) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">প্রোফাইল</h1>
        <p className="text-sm text-slate-600">আপনার অ্যাকাউন্ট এবং ট্যুর রিপোর্ট।</p>
      </div>

      <section className="surface p-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="label">নাম</dt>
            <dd className="mt-1 font-semibold">{profile?.name ?? session.user.name}</dd>
          </div>
          <div>
            <dt className="label">ইমেইল</dt>
            <dd className="mt-1 font-semibold">{profile?.email ?? session.user.email}</dd>
          </div>
          <div>
            <dt className="label">রোল</dt>
            <dd className="mt-1">
              <StatusBadge value={profile?.role ?? session.user.role} />
            </dd>
          </div>
          <div>
            <dt className="label">স্ট্যাটাস</dt>
            <dd className="mt-1">
              <StatusBadge value={profile?.status ?? 'ACTIVE'} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-bold">আমার ট্যুর</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3">ট্যুর</th>
                <th className="px-4 py-3">রুট</th>
                <th className="px-4 py-3">শুরু</th>
                <th className="px-4 py-3">স্ট্যাটাস</th>
                <th className="px-4 py-3">রিপোর্ট</th>
              </tr>
            </thead>
            <tbody>
              {tours.map((tour) => (
                <tr key={tour.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold" data-label="ট্যুর">{tour.title}</td>
                  <td className="table-cell" data-label="রুট">{routeText(tour)}</td>
                  <td className="table-cell" data-label="শুরু">{dateText(tour.startDate)}</td>
                  <td className="table-cell" data-label="স্ট্যাটাস">
                    <StatusBadge value={tour.status} />
                  </td>
                  <td className="table-cell" data-label="রিপোর্ট">
                    <Link className="font-semibold text-river" href={`/tours/${tour.id}/report`}>
                      রিপোর্ট দেখুন
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
