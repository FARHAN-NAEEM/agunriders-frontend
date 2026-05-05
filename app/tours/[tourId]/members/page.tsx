'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Check, Crown, Plus, Search, UserCheck, UsersRound, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { TourTabs } from '@/components/tour-tabs';
import { apiFetch, dateText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { Role, TourMember, User } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const memberCardTones = [
  'border-cyan-200 bg-cyan-50/60',
  'border-orange-200 bg-orange-50/60',
  'border-emerald-200 bg-emerald-50/60',
  'border-violet-200 bg-violet-50/60',
  'border-amber-200 bg-amber-50/60',
];

export default function MembersPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const { data: members = [] } = useQuery({
    queryKey: ['members', tourId],
    queryFn: () => apiFetch<TourMember[]>(`/tours/${tourId}/members`),
    enabled: ready && Boolean(session && tourId),
  });
  const { data: registeredMembers = [] } = useQuery({
    queryKey: ['registered-members'],
    queryFn: () => apiFetch<User[]>('/users?role=MEMBER'),
    enabled: ready && Boolean(session?.user.role === 'ADMIN'),
  });
  const totalMembers = members.length;
  const activeMembers = members.filter((member) => member.isActive).length;
  const adminMembers = members.filter((member) => member.user.role === 'ADMIN').length;
  const currentUserIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const availableMembers = useMemo(
    () => registeredMembers.filter((member) => !currentUserIds.has(member.id)),
    [currentUserIds, registeredMembers],
  );
  const filteredAvailableMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();

    if (!keyword) {
      return availableMembers;
    }

    return availableMembers.filter((member) =>
      [member.name, member.email, member.phone ?? '', member.motorcycleModel ?? ''].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [availableMembers, memberSearch]);
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const selectedMembers = availableMembers.filter((member) => selectedUserIdSet.has(member.id));
  const addMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const results: TourMember[] = [];

      for (const userId of userIds) {
        results.push(
          await apiFetch<TourMember>(`/tours/${tourId}/members`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
          }),
        );
      }

      return results;
    },
    onSuccess: () => {
      setSelectedUserIds([]);
      setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: ['members', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['tours'] });
      void queryClient.invalidateQueries({ queryKey: ['system-members'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ memberId, isActive }: { memberId: string; isActive: boolean }) =>
      apiFetch<TourMember>(`/tours/${tourId}/members/${memberId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
  });
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      apiFetch<User>(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['registered-members'] });
    },
  });

  if (!ready || !session) {
    return null;
  }

  function toggleMember(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function removeSelectedMember(userId: string) {
    setSelectedUserIds((current) => current.filter((id) => id !== userId));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">মেম্বার</h1>
          <p className="text-sm text-slate-600">রেজিস্ট্রেশন করা মেম্বারদের থেকে এই ট্যুরের অংশগ্রহণকারী নির্বাচন করুন।</p>
        </div>
      </div>

      <TourTabs tourId={tourId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">ট্যুর মেম্বার</h2>
          <p className="text-sm text-slate-600">যারা আগে থেকেই সিস্টেমে মেম্বার হিসেবে রেজিস্ট্রেশন করেছে, শুধু তাদের যোগ করা যাবে।</p>
        </div>
        {session.user.role === 'ADMIN' && !showAddForm ? (
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setSelectedUserIds([]);
              setShowAddForm(true);
            }}
          >
            <Plus size={18} aria-hidden="true" />
            মেম্বার নির্বাচন করুন
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<UsersRound size={20} />} label="মোট মেম্বার" value={totalMembers} />
        <StatCard icon={<UserCheck size={20} />} label="অ্যাকটিভ" value={activeMembers} />
        <StatCard icon={<Crown size={20} />} label="অ্যাডমিন" value={adminMembers} />
      </div>

      {session.user.role === 'ADMIN' && showAddForm ? (
        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">রেজিস্টার্ড মেম্বার সিলেক্ট করুন</h2>
              <p className="text-sm text-slate-600">এই ট্যুরে যাদের যোগ করতে চান, নিচের তালিকা থেকে নির্বাচন করুন।</p>
            </div>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                setSelectedUserIds([]);
                setShowAddForm(false);
              }}
            >
              <X size={16} aria-hidden="true" />
              বাতিল
            </button>
          </div>

          {availableMembers.length === 0 ? (
            <div className="mt-5 rounded-md border border-line bg-slate-50 p-4 text-sm text-slate-600">
              যোগ করার মতো নতুন রেজিস্টার্ড মেম্বার নেই। আগে মেম্বারকে রেজিস্ট্রেশন করতে হবে।
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="label">রেজিস্টার্ড মেম্বার</p>
                    <p className="mt-1 text-sm text-slate-600">যাকে ট্যুরে নিতে চান, তার row-তে টিক দিন।</p>
                  </div>
                  <label className="relative w-full max-w-xs">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      className="field pl-9"
                      placeholder="নাম, ইমেইল বা ফোন"
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                    />
                  </label>
                </div>

                <div className="max-h-[430px] space-y-2 overflow-y-auto rounded-xl border border-line bg-slate-50/70 p-3">
                  {filteredAvailableMembers.length === 0 ? (
                    <p className="rounded-lg bg-white p-4 text-sm text-slate-600">এই সার্চে কোনো মেম্বার পাওয়া যায়নি।</p>
                  ) : (
                    filteredAvailableMembers.map((member, index) => {
                      const selected = selectedUserIdSet.has(member.id);

                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={clsx(
                            'grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                            selected
                              ? 'border-river bg-teal-50 ring-2 ring-river/20'
                              : memberCardTones[index % memberCardTones.length],
                          )}
                          onClick={() => toggleMember(member.id)}
                        >
                          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-white text-sm font-black text-river shadow-sm ring-1 ring-black/5">
                            {member.avatarUrl ? (
                              <img alt={member.name} className="h-full w-full object-cover" src={member.avatarUrl} />
                            ) : (
                              initials(member.name)
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-ink">{member.name}</span>
                            <span className="mt-1 block truncate text-sm text-slate-600">{member.email}</span>
                            <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                              {member.phone || 'ফোন সেট করা হয়নি'}
                              {member.motorcycleModel ? ` / ${member.motorcycleModel}` : ''}
                            </span>
                          </span>
                          <span
                            className={clsx(
                              'grid h-8 w-8 place-items-center rounded-lg border transition',
                              selected
                                ? 'border-river bg-river text-white'
                                : 'border-slate-300 bg-white text-transparent',
                            )}
                            aria-hidden="true"
                          >
                            <Check size={18} />
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">সিলেক্টেড মেম্বার</p>
                  <span className="rounded-full bg-river px-2.5 py-1 text-xs font-bold text-white">
                    {selectedMembers.length}
                  </span>
                </div>
                {selectedMembers.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">এখনও কাউকে সিলেক্ট করা হয়নি।</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">{member.name}</p>
                          <p className="truncate text-slate-500">{member.email}</p>
                        </div>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-ember transition hover:bg-red-100"
                          type="button"
                          onClick={() => removeSelectedMember(member.id)}
                          title="সিলেকশন বাদ দিন"
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="btn-primary mt-4 w-full"
                  disabled={selectedUserIds.length === 0 || addMutation.isPending}
                  type="button"
                  onClick={() => addMutation.mutate(selectedUserIds)}
                >
                  <UserCheck size={18} aria-hidden="true" />
                  {addMutation.isPending ? 'যোগ হচ্ছে...' : 'নির্বাচিত মেম্বার যোগ করুন'}
                </button>
                {addMutation.error ? <p className="mt-3 text-sm text-ember">{addMutation.error.message}</p> : null}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-bold">মেম্বার তালিকা</h2>
          <span className="text-sm font-semibold text-slate-500">{totalMembers} জন</span>
        </div>
        {members.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">এই ট্যুরে এখনও কোনো মেম্বার যোগ করা হয়নি।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3">মেম্বার</th>
                  <th className="px-4 py-3">ইমেইল</th>
                  <th className="px-4 py-3">ফোন</th>
                  <th className="px-4 py-3">রোল</th>
                  <th className="px-4 py-3">যোগ দিয়েছে</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  {session.user.role === 'ADMIN' ? <th className="px-4 py-3">অ্যাকশন</th> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="table-cell" data-label="মেম্বার">
                      <Link className="flex items-center gap-3 font-semibold text-river" href={`/members/${member.userId}`}>
                        <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-md bg-orange-50 text-sm font-bold text-river">
                          {member.user.avatarUrl ? (
                            <img alt={member.user.name} className="h-full w-full object-cover" src={member.user.avatarUrl} />
                          ) : (
                            initials(member.user.name)
                          )}
                        </span>
                        <span>{member.user.name}</span>
                      </Link>
                    </td>
                    <td className="table-cell" data-label="ইমেইল">{member.user.email}</td>
                    <td className="table-cell" data-label="ফোন">{member.user.phone ?? '-'}</td>
                    <td className="table-cell" data-label="রোল">
                      <StatusBadge value={member.user.role} />
                    </td>
                    <td className="table-cell" data-label="যোগ দিয়েছে">{dateText(member.joinedAt)}</td>
                    <td className="table-cell" data-label="স্ট্যাটাস">
                      <StatusBadge value={member.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    {session.user.role === 'ADMIN' ? (
                      <td className="table-cell" data-label="অ্যাকশন">
                        <div className="flex flex-wrap gap-2 md:flex-nowrap">
                          <button
                            className={clsx(
                              'btn',
                              member.isActive
                                ? 'border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100'
                                : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
                            )}
                            disabled={statusMutation.isPending}
                            type="button"
                            onClick={() => statusMutation.mutate({ memberId: member.id, isActive: !member.isActive })}
                          >
                            {member.isActive ? 'ইনঅ্যাকটিভ করুন' : 'অ্যাকটিভ করুন'}
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={roleMutation.isPending}
                            type="button"
                            onClick={() =>
                              roleMutation.mutate({
                                userId: member.userId,
                                role: member.user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN',
                              })
                            }
                          >
                            {member.user.role === 'ADMIN' ? 'মেম্বার করুন' : 'অ্যাডমিন করুন'}
                          </button>
                        </div>
                      </td>
                    ) : null}
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
