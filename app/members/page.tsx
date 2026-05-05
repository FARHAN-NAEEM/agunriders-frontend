'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, History, Search, Trash2, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, dateText, routeText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { User } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function MembersPage() {
  const { session, ready } = useSessionGuard();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const isAdmin = session?.user.role === 'ADMIN';
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['system-members'],
    queryFn: () => apiFetch<User[]>('/users?role=MEMBER'),
    enabled: ready && Boolean(session && isAdmin),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['system-members'] }),
  });

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return members;
    }

    return members.filter((member) =>
      [
        member.name,
        member.email,
        member.phone ?? '',
        member.drivingLicenseNumber ?? '',
        member.motorcycleRegistrationNumber ?? '',
        member.motorcycleModel ?? '',
      ].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [members, search]);

  if (!ready || !session) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="surface p-5">
        <h1 className="text-2xl font-bold text-ink">মেম্বারস</h1>
        <p className="mt-2 text-sm text-slate-600">এই পেজটি শুধু অ্যাডমিন দেখতে পারবে।</p>
      </div>
    );
  }

  function confirmDeleteMember() {
    if (!deleteTarget) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">মেম্বারস</h1>
        <p className="text-sm text-slate-600">সিস্টেমে মেম্বার হিসেবে রেজিস্ট্রেশন করা ইউজারদের সম্পূর্ণ তথ্য।</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<UsersRound size={20} />} label="মোট মেম্বার" value={members.length} />
        <StatCard
          icon={<UsersRound size={20} />}
          label="অ্যাক্টিভ মেম্বার"
          value={members.filter((member) => member.status !== 'INACTIVE').length}
        />
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-bold">মেম্বার তালিকা</h2>
            <p className="text-sm text-slate-600">নাম, ইমেইল, ফোন, লাইসেন্স বা বাইক তথ্য দিয়ে খুঁজুন।</p>
          </div>
          <label className="relative w-full max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              className="field pl-9"
              placeholder="মেম্বার খুঁজুন"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-slate-600">মেম্বার লোড হচ্ছে...</p>
        ) : filteredMembers.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">
            {search ? 'এই সার্চে কোনো মেম্বার পাওয়া যায়নি।' : 'এখনও কোনো মেম্বার রেজিস্ট্রেশন করেনি।'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3">মেম্বার</th>
                  <th className="px-4 py-3">যোগাযোগ</th>
                  <th className="px-4 py-3">লাইসেন্স</th>
                  <th className="px-4 py-3">মোটরসাইকেল</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3">যুক্ত ট্যুর</th>
                  <th className="px-4 py-3">রেজিস্ট্রেশন</th>
                  <th className="px-4 py-3">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="table-cell" data-label="মেম্বার">
                      <Link className="flex items-center gap-3 font-semibold text-river" href={`/members/${member.id}`}>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-50 text-sm font-bold text-river">
                          {member.avatarUrl ? (
                            <img alt={member.name} className="h-full w-full object-cover" src={member.avatarUrl} />
                          ) : (
                            initials(member.name)
                          )}
                        </span>
                        <span>{member.name}</span>
                      </Link>
                    </td>
                    <td className="table-cell" data-label="যোগাযোগ">
                      <div className="space-y-1">
                        <p>{member.email}</p>
                        <p className="text-sm text-slate-500">{member.phone || 'ফোন সেট করা হয়নি'}</p>
                      </div>
                    </td>
                    <td className="table-cell" data-label="লাইসেন্স">{member.drivingLicenseNumber || 'সেট করা হয়নি'}</td>
                    <td className="table-cell" data-label="মোটরসাইকেল">
                      <div className="space-y-1">
                        <p>{member.motorcycleModel || 'মডেল সেট করা হয়নি'}</p>
                        <p className="text-sm text-slate-500">
                          {member.motorcycleRegistrationNumber || 'রেজিস্ট্রেশন সেট করা হয়নি'}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell" data-label="স্ট্যাটাস">
                      <StatusBadge value={member.status ?? 'ACTIVE'} />
                    </td>
                    <td className="table-cell" data-label="যুক্ত ট্যুর">
                      <div className="space-y-1">
                        <Link className="font-semibold text-river" href={`/members/${member.id}/tours`}>
                          {member._count?.tourMembers ?? 0} ট্যুর
                        </Link>
                        <p className="max-w-[240px] truncate text-sm text-slate-500">
                          {member.tourMembers?.[0] ? routeText(member.tourMembers[0].tour) : 'এখনও কোনো ট্যুর নেই'}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell" data-label="রেজিস্ট্রেশন">{dateText(member.createdAt)}</td>
                    <td className="table-cell" data-label="অ্যাকশন">
                      <div className="flex flex-wrap gap-2 md:flex-nowrap">
                        <Link
                          aria-label={`${member.name} প্রোফাইল দেখুন`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink shadow-sm transition hover:bg-cyan-50 hover:text-river"
                          href={`/members/${member.id}`}
                          title="প্রোফাইল"
                        >
                          <Eye size={15} aria-hidden="true" />
                        </Link>
                        <Link
                          aria-label={`${member.name} ট্যুর হিস্ট্রি দেখুন`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink shadow-sm transition hover:bg-cyan-50 hover:text-river"
                          href={`/members/${member.id}/tours`}
                          title="হিস্ট্রি"
                        >
                          <History size={15} aria-hidden="true" />
                        </Link>
                        <button
                          aria-label={`${member.name} ডিলিট করুন`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg bg-ember text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          type="button"
                          title="ডিলিট"
                          onClick={() => setDeleteTarget(member)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="মেম্বার ডিলিট করবেন?"
        message={
          <>
            <strong>{deleteTarget?.name}</strong> মেম্বারকে ডিলিট করলে তার অ্যাকাউন্ট আর সাধারণ তালিকায় দেখা যাবে না।
            পুরনো ট্যুরের হিসাব সংরক্ষিত থাকবে।
          </>
        }
        confirmLabel="হ্যাঁ, মেম্বার ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteMember}
      />
    </div>
  );
}
