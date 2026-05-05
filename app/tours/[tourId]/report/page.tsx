'use client';

import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, CalendarDays, CheckCircle2, Fuel, ReceiptText, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { TourTabs } from '@/components/tour-tabs';
import { apiFetch, dateText, money, routeText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { TourReport } from '@/lib/types';

export default function ReportPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;
  const { session, ready } = useSessionGuard();
  const { data: report, isLoading } = useQuery({
    queryKey: ['report', tourId],
    queryFn: () => apiFetch<TourReport>(`/tours/${tourId}/report`),
    enabled: ready && Boolean(session && tourId),
  });

  if (!ready || !session) {
    return null;
  }

  const receiveCount = report?.members.filter((member) => member.status === 'WILL_RECEIVE').length ?? 0;
  const payCount = report?.members.filter((member) => member.status === 'WILL_PAY').length ?? 0;
  const settledCount = report?.members.filter((member) => member.status === 'SETTLED').length ?? 0;
  const estimatedTotalBudget =
    Number(report?.tour.estimatedBudget ?? 0) * (report?.summary.totalMembers ?? 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">রিপোর্ট</h1>
        <p className="text-sm text-slate-600">ব্যাকএন্ড থেকে ক্যালকুলেটেড ব্যালেন্স এবং সেটেলমেন্ট সাজেশন।</p>
      </div>

      <TourTabs tourId={tourId} />

      {isLoading || !report ? (
        <p className="surface p-4 text-sm text-slate-600">রিপোর্ট লোড হচ্ছে...</p>
      ) : session.user.role === 'MEMBER' ? (
        <MemberOnlyReport report={report} userId={session.user.id} />
      ) : (
        <>
          <section className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="label">ট্যুর রিপোর্ট</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{report.tour.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>{routeText(report.tour)}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={16} aria-hidden="true" />
                    {dateText(report.tour.startDate)}
                    {report.tour.endDate ? ` - ${dateText(report.tour.endDate)}` : ''}
                  </span>
                  {report.tour.estimatedBudget ? (
                    <span>
                      প্রতি মেম্বার {money(report.tour.estimatedBudget)} / আনুমানিক মোট {money(estimatedTotalBudget)}
                    </span>
                  ) : null}
                </div>
              </div>
              <StatusBadge value={report.tour.status} />
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<ReceiptText size={20} />} label="মোট খরচ" value={money(report.summary.totalExpense)} />
            <StatCard icon={<Fuel size={20} />} label="ফুয়েল খরচ" value={money(report.summary.totalFuelCost)} />
            <StatCard icon={<Banknote size={20} />} label="মোট লোন" value={money(report.summary.totalLoan)} />
            <StatCard icon={<Users size={20} />} label="মেম্বার" value={report.summary.totalMembers} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600">যারা পাবে</p>
                <ArrowUpRight size={20} className="text-emerald-700" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{receiveCount}</p>
            </div>
            <div className="surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600">যারা দেবে</p>
                <ArrowDownRight size={20} className="text-ember" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-bold text-ember">{payCount}</p>
            </div>
            <div className="surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600">সেটেলড</p>
                <CheckCircle2 size={20} className="text-slate-600" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">{settledCount}</p>
            </div>
          </div>

          <section className="surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="font-bold">মেম্বার ব্যালেন্স</h2>
                <p className="text-sm text-slate-600">পেমেন্ট, শেয়ার, লোন, সেটেলমেন্ট এবং ফাইনাল ব্যালেন্স একসাথে।</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                গড় শেয়ার {money(report.summary.averageShare)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] border-collapse">
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3">মেম্বার</th>
                    <th className="px-4 py-3">পেমেন্ট</th>
                    <th className="px-4 py-3">শেয়ার</th>
                    <th className="px-4 py-3">লোন দিয়েছে</th>
                    <th className="px-4 py-3">লোন নিয়েছে</th>
                    <th className="px-4 py-3">সেটেলমেন্ট দিয়েছে</th>
                    <th className="px-4 py-3">সেটেলমেন্ট পেয়েছে</th>
                    <th className="px-4 py-3">ফাইনাল</th>
                    <th className="px-4 py-3">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {report.members.map((member) => (
                    <tr
                      key={member.userId}
                      className={clsx('hover:bg-slate-50', member.userId === session.user.id && 'bg-teal-50/50')}
                    >
                      <td className="table-cell font-semibold" data-label="মেম্বার">{member.name}</td>
                      <td className="table-cell" data-label="পেমেন্ট">{money(member.totalPaid)}</td>
                      <td className="table-cell" data-label="শেয়ার">{money(member.totalShare)}</td>
                      <td className="table-cell" data-label="লোন দিয়েছে">{money(member.loanGiven)}</td>
                      <td className="table-cell" data-label="লোন নিয়েছে">{money(member.loanTaken)}</td>
                      <td className="table-cell" data-label="সেটেলমেন্ট দিয়েছে">{money(member.settlementPaid)}</td>
                      <td className="table-cell" data-label="সেটেলমেন্ট পেয়েছে">{money(member.settlementReceived)}</td>
                      <td className={clsx('table-cell font-bold', Number(member.finalBalance) >= 0 ? 'text-emerald-700' : 'text-ember')} data-label="ফাইনাল">
                        {money(member.finalBalance)}
                      </td>
                      <td className="table-cell" data-label="স্ট্যাটাস">
                        <StatusBadge value={member.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="font-bold">সেটেলমেন্ট সাজেশন</h2>
                <p className="text-sm text-slate-600">ব্যালেন্স শূন্যে আনতে সবচেয়ে সহজ ট্রান্সফার।</p>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-river">
                {report.settlementSuggestions.length} টি ট্রান্সফার
              </span>
            </div>
            {report.settlementSuggestions.length === 0 ? (
              <div className="flex items-center gap-3 p-4 text-sm text-slate-600">
                <CheckCircle2 size={20} className="text-emerald-700" aria-hidden="true" />
                সবাই সেটেলড। কোনো পেমেন্ট ট্রান্সফার লাগবে না।
              </div>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {report.settlementSuggestions.map((suggestion) => (
                  <div
                    key={`${suggestion.fromUserId}-${suggestion.toUserId}`}
                    className="rounded-md border border-line bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold">{suggestion.from}</span>
                      <ArrowRight size={18} className="text-river" aria-hidden="true" />
                      <span className="font-semibold">{suggestion.to}</span>
                    </div>
                    <p className="mt-3 text-xl font-bold text-emerald-700">{money(suggestion.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MemberOnlyReport({ report, userId }: { report: TourReport; userId: string }) {
  const member = report.members.find((item) => item.userId === userId) ?? report.members[0];
  const finalBalance = Number(member?.finalBalance ?? 0);
  const willReceive = finalBalance > 0;
  const willPay = finalBalance < 0;
  const personalSuggestions = report.settlementSuggestions.filter(
    (suggestion) => suggestion.fromUserId === userId || suggestion.toUserId === userId,
  );
  const firstInstruction = personalSuggestions[0];
  const firstInstructionIsPayment = firstInstruction?.fromUserId === userId;
  const firstInstructionPerson = firstInstruction
    ? firstInstructionIsPayment
      ? firstInstruction.to
      : firstInstruction.from
    : '';
  const actionTitle = firstInstruction
    ? firstInstructionIsPayment
      ? `${firstInstructionPerson}-কে পেমেন্ট করুন`
      : `${firstInstructionPerson}-এর কাছ থেকে টাকা পাবেন`
    : willReceive
      ? 'আপনি টাকা পাবেন'
      : willPay
        ? 'আপনি টাকা দেবেন'
        : 'সব হিসাব সেটেলড';
  const actionDescription = firstInstruction
    ? firstInstructionIsPayment
      ? `নিচের নির্দেশনা অনুযায়ী ${firstInstructionPerson}-কে টাকা দিন।`
      : `নিচের নির্দেশনায় দেখা যাচ্ছে ${firstInstructionPerson} আপনাকে টাকা দেবে।`
    : willReceive
      ? 'আপনার পাওনা আছে, কিন্তু এখন কোনো নির্দিষ্ট পেমেন্ট নির্দেশনা নেই।'
      : willPay
        ? 'আপনার দেনা আছে, কিন্তু এখন কোনো নির্দিষ্ট পেমেন্ট নির্দেশনা নেই।'
        : 'এই ট্যুরে আপনার আর কোনো টাকা দেওয়া বা পাওয়ার বাকি নেই।';

  return (
    <>
      <section className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">আপনার ট্যুর রিপোর্ট</p>
            <h2 className="mt-1 text-xl font-bold text-ink">{report.tour.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>{routeText(report.tour)}</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={16} aria-hidden="true" />
                {dateText(report.tour.startDate)}
                {report.tour.endDate ? ` - ${dateText(report.tour.endDate)}` : ''}
              </span>
            </div>
          </div>
          <StatusBadge value={report.tour.status} />
        </div>
      </section>

      <section
        className={clsx(
          'surface overflow-hidden border-l-4 p-5',
          willReceive ? 'border-l-emerald-600' : willPay ? 'border-l-ember' : 'border-l-slate-400',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="label">আপনার করণীয়</p>
            <h2 className="mt-1 text-2xl font-black text-ink">{actionTitle}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">{actionDescription}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase text-slate-500">চূড়ান্ত ব্যালেন্স</p>
            <p className={clsx('mt-2 text-3xl font-black', willReceive ? 'text-emerald-700' : willPay ? 'text-ember' : 'text-ink')}>
              {money(Math.abs(finalBalance))}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {willReceive ? (
                <ArrowUpRight size={14} aria-hidden="true" />
              ) : willPay ? (
                <ArrowDownRight size={14} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={14} aria-hidden="true" />
              )}
              {willReceive ? 'পাবেন' : willPay ? 'দেবেন' : 'সেটেলড'}
            </p>
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-bold">আপনার পেমেন্ট নির্দেশনা</h2>
            <p className="text-sm text-slate-600">শুধু আপনার দেওয়া বা পাওয়ার হিসাব এখানে দেখানো হচ্ছে।</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-river">
            {personalSuggestions.length} টি আইটেম
          </span>
        </div>

        {personalSuggestions.length === 0 ? (
          <div className="flex items-center gap-3 p-4 text-sm text-slate-600">
            <CheckCircle2 size={20} className="text-emerald-700" aria-hidden="true" />
            আপনার কোনো পেমেন্ট বাকি নেই।
          </div>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {personalSuggestions.map((suggestion) => {
              const isPayer = suggestion.fromUserId === userId;
              const otherName = isPayer ? suggestion.to : suggestion.from;

              return (
                <article
                  key={`${suggestion.fromUserId}-${suggestion.toUserId}-${suggestion.amount}`}
                  className={clsx(
                    'rounded-xl border p-4 shadow-sm',
                    isPayer ? 'border-red-100 bg-red-50/70' : 'border-emerald-100 bg-emerald-50/70',
                  )}
                >
                  <p className="text-xs font-bold uppercase text-slate-500">
                    {isPayer ? 'আপনি দেবেন' : 'আপনি পাবেন'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{isPayer ? 'আপনি' : otherName}</span>
                    <ArrowRight size={17} className="text-river" aria-hidden="true" />
                    <span className="font-bold text-ink">{isPayer ? otherName : 'আপনি'}</span>
                  </div>
                  <p className={clsx('mt-3 text-2xl font-black', isPayer ? 'text-ember' : 'text-emerald-700')}>
                    {money(suggestion.amount)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
