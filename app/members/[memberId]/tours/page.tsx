'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, dateText, routeText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { User } from '@/lib/types';

export default function MemberTourHistoryPage() {
  const params = useParams<{ memberId: string }>();
  const memberId = params.memberId;
  const { session, ready } = useSessionGuard();
  const isAdmin = session?.user.role === 'ADMIN';
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => apiFetch<User>(`/users/${memberId}`),
    enabled: ready && Boolean(session && isAdmin && memberId),
  });

  if (!ready || !session) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="surface p-5">
        <h1 className="text-2xl font-bold text-ink">ট্যুর হিস্ট্রি</h1>
        <p className="mt-2 text-sm text-slate-600">এই পেজটি শুধু অ্যাডমিন দেখতে পারবে।</p>
      </div>
    );
  }

  if (isLoading || !member) {
    return <p className="surface p-4 text-sm text-slate-600">ট্যুর হিস্ট্রি লোড হচ্ছে...</p>;
  }

  return (
    <div className="space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-river" href={`/members/${member.id}`}>
        <ArrowLeft size={16} aria-hidden="true" />
        মেম্বার প্রোফাইলে ফিরুন
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-ink">{member.name} - ট্যুর হিস্ট্রি</h1>
        <p className="text-sm text-slate-600">এই মেম্বার কোন কোন ট্যুরে যুক্ত হয়েছে তার পূর্ণ তালিকা।</p>
      </div>

      <section className="surface overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-bold">সব ট্যুর</h2>
        </div>
        {member.tourMembers?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3">ট্যুর</th>
                  <th className="px-4 py-3">রুট</th>
                  <th className="px-4 py-3">শুরু</th>
                  <th className="px-4 py-3">শেষ</th>
                  <th className="px-4 py-3">ট্যুর স্ট্যাটাস</th>
                  <th className="px-4 py-3">যুক্ত হয়েছে</th>
                  <th className="px-4 py-3">মেম্বার স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {member.tourMembers.map((history) => (
                  <tr key={history.id} className="hover:bg-slate-50">
                    <td className="table-cell" data-label="ট্যুর">
                      <Link className="font-semibold text-river" href={`/tours/${history.tour.id}`}>
                        {history.tour.title}
                      </Link>
                    </td>
                    <td className="table-cell" data-label="রুট">{routeText(history.tour)}</td>
                    <td className="table-cell" data-label="শুরু">{dateText(history.tour.startDate)}</td>
                    <td className="table-cell" data-label="শেষ">{dateText(history.tour.endDate)}</td>
                    <td className="table-cell" data-label="ট্যুর স্ট্যাটাস">
                      <StatusBadge value={history.tour.status} />
                    </td>
                    <td className="table-cell" data-label="যুক্ত হয়েছে">{dateText(history.joinedAt)}</td>
                    <td className="table-cell" data-label="মেম্বার স্ট্যাটাস">
                      <StatusBadge value={history.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-600">এই মেম্বারের কোনো ট্যুর হিস্ট্রি নেই।</p>
        )}
      </section>
    </div>
  );
}
