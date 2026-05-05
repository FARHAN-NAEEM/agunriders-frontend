import clsx from 'clsx';
import { bnLabel, statusLabel } from '@/lib/i18n';

const tones: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-200',
  ADMIN: 'bg-orange-50 text-orange-700 ring-orange-200',
  MEMBER: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  COMPLETED: 'bg-blue-50 text-blue-700 ring-blue-200',
  LOCKED: 'bg-zinc-100 text-zinc-700 ring-zinc-300',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
  WILL_RECEIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  WILL_PAY: 'bg-red-50 text-red-700 ring-red-200',
  SETTLED: 'bg-slate-100 text-slate-700 ring-slate-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  LOAN: 'bg-violet-50 text-violet-700 ring-violet-200',
  EXPENSE: 'bg-orange-50 text-orange-700 ring-orange-200',
  FUEL: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  MANUAL: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1',
        tones[value] ?? 'bg-amber-50 text-amber-700 ring-amber-200',
      )}
    >
      {bnLabel(value, statusLabel)}
    </span>
  );
}
