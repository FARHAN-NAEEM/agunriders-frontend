'use client';

import { useQuery } from '@tanstack/react-query';
import { Banknote, Fuel, MapPinned, Users } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, dateText, routeText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { Tour } from '@/lib/types';

export default function DashboardPage() {
  const { session, ready } = useSessionGuard();
  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours'],
    queryFn: () => apiFetch<Tour[]>('/tours'),
    enabled: ready && Boolean(session),
  });
  const activeTours = tours.filter((tour) => tour.status === 'ACTIVE').length;
  const completedTours = tours.filter((tour) => tour.status === 'COMPLETED' || tour.status === 'LOCKED').length;
  const totalMembers = tours.reduce((total, tour) => total + (tour._count?.members ?? 0), 0);
  const totalEntries = tours.reduce(
    (total, tour) =>
      total + (tour._count?.expenses ?? 0) + (tour._count?.loans ?? 0) + (tour._count?.fuelExpenses ?? 0),
    0,
  );

  if (!ready || !session) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-2xl font-bold text-ink">ড্যাশবোর্ড</h1>
          <p className="text-sm text-slate-600">ট্যুর খরচ, মেম্বার ব্যালেন্স এবং সেটেলমেন্টের সারাংশ।</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<MapPinned size={20} />} label="মোট ট্যুর" value={tours.length} />
        <StatCard icon={<Fuel size={20} />} label="অ্যাক্টিভ ট্যুর" value={activeTours} />
        <StatCard icon={<Users size={20} />} label="মোট মেম্বার" value={totalMembers} />
        <StatCard icon={<Banknote size={20} />} label="মোট এন্ট্রি" value={totalEntries} />
      </div>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-bold">সাম্প্রতিক ট্যুর</h2>
          <span className="text-sm text-slate-500">{completedTours} সম্পন্ন</span>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-slate-600">ট্যুর লোড হচ্ছে...</p>
        ) : tours.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">এখনও কোনো ট্যুর নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3">ট্যুর</th>
                  <th className="px-4 py-3">রুট</th>
                  <th className="px-4 py-3">শুরু</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3">মেম্বার</th>
                </tr>
              </thead>
              <tbody>
                {tours.slice(0, 6).map((tour) => (
                  <tr key={tour.id} className="hover:bg-slate-50">
                    <td className="table-cell" data-label="ট্যুর">
                      <Link
                        className="font-semibold text-river"
                        href={session.user.role === 'MEMBER' ? `/tours/${tour.id}/report` : `/tours/${tour.id}`}
                      >
                        {tour.title}
                      </Link>
                    </td>
                    <td className="table-cell" data-label="রুট">{routeText(tour)}</td>
                    <td className="table-cell" data-label="শুরু">{dateText(tour.startDate)}</td>
                    <td className="table-cell" data-label="স্ট্যাটাস">
                      <StatusBadge value={tour.status} />
                    </td>
                    <td className="table-cell" data-label="মেম্বার">{tour._count?.members ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
