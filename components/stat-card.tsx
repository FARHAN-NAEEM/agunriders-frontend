import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="surface group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-river via-cyan-500 to-sun" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">{label}</p>
        {icon ? (
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-50 text-river ring-1 ring-cyan-100 transition group-hover:bg-river group-hover:text-white">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-black text-ink">{value}</p>
    </div>
  );
}
