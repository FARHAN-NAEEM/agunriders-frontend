'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, dateText, estimatedTourBudget, money, routeText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { Tour } from '@/lib/types';

export default function ToursPage() {
  const { session, ready } = useSessionGuard();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Tour | null>(null);
  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours'],
    queryFn: () => apiFetch<Tour[]>('/tours'),
    enabled: ready && Boolean(session),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/tours/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tours'] }),
  });

  if (!ready || !session) {
    return null;
  }

  function confirmDeleteTour() {
    if (!deleteTarget) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">ট্যুরসমূহ</h1>
          <p className="text-sm text-slate-600">ট্যুর তৈরি করুন, মেম্বার যোগ করুন, ব্যালেন্স ট্র্যাক করুন।</p>
        </div>
        {session.user.role === 'ADMIN' ? (
          <Link className="btn-primary" href="/tours/create">
            <Plus size={18} aria-hidden="true" />
            নতুন ট্যুর
          </Link>
        ) : null}
      </div>

      <section className="surface overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-sm text-slate-600">ট্যুর লোড হচ্ছে...</p>
        ) : tours.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">এখনও কোনো ট্যুর নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3">ট্যুর</th>
                  <th className="px-4 py-3">রুট</th>
                  <th className="px-4 py-3">তারিখ</th>
                  <th className="px-4 py-3">আনুমানিক বাজেট</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3">এন্ট্রি</th>
                  {session.user.role === 'ADMIN' ? <th className="px-4 py-3">অ্যাকশন</th> : null}
                </tr>
              </thead>
              <tbody>
                {tours.map((tour) => {
                  const budget = estimatedTourBudget(tour);

                  return (
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
                    <td className="table-cell" data-label="তারিখ">
                      {dateText(tour.startDate)} - {dateText(tour.endDate)}
                    </td>
                    <td className="table-cell" data-label="আনুমানিক বাজেট">
                      {tour.estimatedBudget ? (
                        <div className="space-y-1">
                          <p className="font-semibold">প্রতি মেম্বার {money(budget.perPerson)}</p>
                          <p className="text-sm text-slate-500">
                            মোট {money(budget.total)} / {budget.memberCount} জন
                          </p>
                        </div>
                      ) : (
                        'সেট করা হয়নি'
                      )}
                    </td>
                    <td className="table-cell" data-label="স্ট্যাটাস">
                      <StatusBadge value={tour.status} />
                    </td>
                    <td className="table-cell" data-label="এন্ট্রি">
                      {(tour._count?.expenses ?? 0) + (tour._count?.loans ?? 0) + (tour._count?.fuelExpenses ?? 0)}
                    </td>
                    {session.user.role === 'ADMIN' ? (
                      <td className="table-cell" data-label="অ্যাকশন">
                        <button
                          aria-label={`${tour.title} ডিলিট করুন`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg bg-ember text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          type="button"
                          title="ডিলিট"
                          onClick={() => setDeleteTarget(tour)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="ট্যুর ডিলিট করবেন?"
        message={
          <>
            <strong>{deleteTarget?.title}</strong> ট্যুরটি ডিলিট হলে এই ট্যুরের সব খরচ, লোন, ফুয়েল,
            সেটেলমেন্ট এবং ট্যুর মেম্বার ডাটা মুছে যাবে।
          </>
        }
        confirmLabel="হ্যাঁ, ট্যুর ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTour}
      />
    </div>
  );
}
