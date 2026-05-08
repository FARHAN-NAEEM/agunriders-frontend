'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Fuel, Pencil, ReceiptText, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { TourTabs } from '@/components/tour-tabs';
import { apiFetch, dateText, estimatedTourBudget, money, routeText } from '@/lib/api';
import { bnLabel, statusLabel } from '@/lib/i18n';
import { useSessionGuard } from '@/lib/hooks';
import type { Tour, TourReport, TourStatus } from '@/lib/types';

const statuses: TourStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'LOCKED', 'CANCELLED'];

export default function TourOverviewPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const { data: tour } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => apiFetch<Tour>(`/tours/${tourId}`),
    enabled: ready && Boolean(session && tourId),
  });
  const { data: report } = useQuery({
    queryKey: ['report', tourId],
    queryFn: () => apiFetch<TourReport>(`/tours/${tourId}/report`),
    enabled: ready && Boolean(session && tourId),
  });
  const statusMutation = useMutation({
    mutationFn: (status: TourStatus) =>
      apiFetch<Tour>(`/tours/${tourId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
  });

  if (!ready || !session) {
    return null;
  }

  const budget = estimatedTourBudget(tour);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{tour?.title ?? 'ট্যুর'}</h1>
          <p className="text-sm text-slate-600">{routeText(tour)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tour ? <StatusBadge value={tour.status} /> : null}
          {session.user.role === 'ADMIN' && tour ? (
            <Link
              aria-label={`${tour.title} এডিট করুন`}
              className="inline-grid h-10 w-10 place-items-center rounded-lg bg-white text-river shadow-sm ring-1 ring-line transition hover:bg-teal-50 hover:ring-river"
              href={`/tours/${tour.id}/edit`}
              title="এডিট"
            >
              <Pencil size={17} aria-hidden="true" />
            </Link>
          ) : null}
          {session.user.role === 'ADMIN' && tour ? (
            <select
              className="field w-40"
              disabled={statusMutation.isPending}
              value={tour.status}
              onChange={(event) => statusMutation.mutate(event.target.value as TourStatus)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {bnLabel(status, statusLabel)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <TourTabs tourId={tourId} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<ReceiptText size={20} />} label="মোট খরচ" value={money(report?.summary.totalExpense)} />
        <StatCard icon={<Fuel size={20} />} label="ফুয়েল খরচ" value={money(report?.summary.totalFuelCost)} />
        <StatCard icon={<Users size={20} />} label="মেম্বার" value={report?.summary.totalMembers ?? 0} />
        <StatCard icon={<CalendarDays size={20} />} label="গড় শেয়ার" value={money(report?.summary.averageShare)} />
      </div>

      <section className="surface p-5">
        <h2 className="text-lg font-bold">ট্যুর সারাংশ</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="label">যাত্রা শুরুর স্থান</dt>
            <dd className="mt-1 font-semibold">{tour?.startLocation ?? 'সেট করা হয়নি'}</dd>
          </div>
          <div>
            <dt className="label">গন্তব্য</dt>
            <dd className="mt-1 font-semibold">{tour?.destination ?? 'সেট করা হয়নি'}</dd>
          </div>
          <div>
            <dt className="label">শুরুর তারিখ</dt>
            <dd className="mt-1 font-semibold">{dateText(tour?.startDate)}</dd>
          </div>
          <div>
            <dt className="label">শেষ তারিখ</dt>
            <dd className="mt-1 font-semibold">{dateText(tour?.endDate)}</dd>
          </div>
          <div>
            <dt className="label">প্রতি মেম্বারের আনুমানিক বাজেট</dt>
            <dd className="mt-1 font-semibold">{tour?.estimatedBudget ? money(budget.perPerson) : 'সেট করা হয়নি'}</dd>
          </div>
          <div>
            <dt className="label">আনুমানিক মোট বাজেট</dt>
            <dd className="mt-1 font-semibold">
              {tour?.estimatedBudget ? `${money(budget.total)} / ${budget.memberCount} জন` : 'সেট করা হয়নি'}
            </dd>
          </div>
          <div>
            <dt className="label">মোট লোন</dt>
            <dd className="mt-1 font-semibold">{money(report?.summary.totalLoan)}</dd>
          </div>
        </dl>
        {tour?.requirements?.length ? (
          <div className="mt-5">
            <h3 className="label">রিকোয়ারমেন্ট</h3>
            <ul className="mt-2 space-y-2">
              {tour.requirements.map((requirement) => (
                <li key={requirement} className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tour?.description ? <p className="mt-4 text-sm leading-6 text-slate-700">{tour.description}</p> : null}
      </section>
    </div>
  );
}
