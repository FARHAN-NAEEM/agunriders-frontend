'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, History, Pencil, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, dateText, routeText } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from '@/lib/image';
import type { User } from '@/lib/types';

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  drivingLicenseNumber: string;
  motorcycleRegistrationNumber: string;
  motorcycleModel: string;
  status: string;
};

const emptyForm: MemberForm = {
  name: '',
  email: '',
  phone: '',
  avatarUrl: '',
  drivingLicenseNumber: '',
  motorcycleRegistrationNumber: '',
  motorcycleModel: '',
  status: 'ACTIVE',
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function valueOrUnset(value?: string | null) {
  return value || 'সেট করা হয়নি';
}

export default function MemberProfilePage() {
  const params = useParams<{ memberId: string }>();
  const memberId = params.memberId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [imageError, setImageError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isAdmin = session?.user.role === 'ADMIN';
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => apiFetch<User>(`/users/${memberId}`),
    enabled: ready && Boolean(session && isAdmin && memberId),
  });
  const updateMutation = useMutation({
    mutationFn: (values: MemberForm) =>
      apiFetch<User>(`/users/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: (updated) => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      void queryClient.invalidateQueries({ queryKey: ['system-members'] });
      setForm(fromMember(updated));
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => apiFetch<{ message: string }>(`/users/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system-members'] });
      router.push('/members');
    },
  });

  useEffect(() => {
    if (member) {
      setForm(fromMember(member));
    }
  }, [member]);

  if (!ready || !session) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="surface p-5">
        <h1 className="text-2xl font-bold text-ink">মেম্বার প্রোফাইল</h1>
        <p className="mt-2 text-sm text-slate-600">এই পেজটি শুধু অ্যাডমিন দেখতে পারবে।</p>
      </div>
    );
  }

  function fromMember(item: User): MemberForm {
    return {
      name: item.name ?? '',
      email: item.email ?? '',
      phone: item.phone ?? '',
      avatarUrl: item.avatarUrl ?? '',
      drivingLicenseNumber: item.drivingLicenseNumber ?? '',
      motorcycleRegistrationNumber: item.motorcycleRegistrationNumber ?? '',
      motorcycleModel: item.motorcycleModel ?? '',
      status: item.status ?? 'ACTIVE',
    };
  }

  function setField(field: keyof MemberForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError('');

    if (!file) {
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError(`ছবির সাইজ সর্বোচ্চ ${MAX_IMAGE_SIZE_LABEL} হতে পারবে`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setField('avatarUrl', String(reader.result));
    reader.readAsDataURL(file);
  }

  function confirmDeleteMember() {
    if (!member) {
      return;
    }

    deleteMutation.mutate();
  }

  if (isLoading || !member) {
    return <p className="surface p-4 text-sm text-slate-600">মেম্বার প্রোফাইল লোড হচ্ছে...</p>;
  }

  return (
    <div className="space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-river" href="/members">
        <ArrowLeft size={16} aria-hidden="true" />
        মেম্বার তালিকায় ফিরুন
      </Link>

      <section className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-orange-50 text-xl font-bold text-river">
              {(editing ? form.avatarUrl : member.avatarUrl) ? (
                <img
                  alt={member.name}
                  className="h-full w-full object-cover"
                  src={editing ? form.avatarUrl : member.avatarUrl ?? ''}
                />
              ) : (
                initials(member.name)
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">{member.name}</h1>
              <p className="text-sm text-slate-600">{member.email}</p>
              <div className="mt-2">
                <StatusBadge value={member.status ?? 'ACTIVE'} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary" href={`/members/${member.id}/tours`}>
              <History size={16} aria-hidden="true" />
              ট্যুর হিস্ট্রি
            </Link>
            {editing ? (
              <>
                <button className="btn-primary" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate(form)} type="button">
                  <Save size={16} aria-hidden="true" />
                  সেভ
                </button>
                <button className="btn-secondary" onClick={() => { setEditing(false); setForm(fromMember(member)); }} type="button">
                  <X size={16} aria-hidden="true" />
                  বাতিল
                </button>
              </>
            ) : (
              <button className="btn-secondary" onClick={() => setEditing(true)} type="button">
                <Pencil size={16} aria-hidden="true" />
                এডিট
              </button>
            )}
            <button className="btn-danger" disabled={deleteMutation.isPending} onClick={() => setDeleteDialogOpen(true)} type="button">
              <Trash2 size={16} aria-hidden="true" />
              ডিলিট
            </button>
          </div>
        </div>

        {editing ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="label">মেম্বারের ছবি</span>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="btn-secondary cursor-pointer">
                  <Camera size={16} aria-hidden="true" />
                  ছবি বদলান
                  <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
                </label>
                <button className="btn-secondary" type="button" onClick={() => setField('avatarUrl', '')}>
                  ছবি সরান
                </button>
                <span className="text-xs text-slate-500">ঐচ্ছিক, সর্বোচ্চ {MAX_IMAGE_SIZE_LABEL}</span>
              </div>
              {imageError ? <span className="mt-2 block text-xs text-ember">{imageError}</span> : null}
            </div>

            <label className="block space-y-1">
              <span className="label">নাম</span>
              <input className="field" value={form.name} onChange={(event) => setField('name', event.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="label">ইমেইল</span>
              <input className="field" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="label">ফোন</span>
              <input className="field" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="label">স্ট্যাটাস</span>
              <select className="field" value={form.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ACTIVE">অ্যাক্টিভ</option>
                <option value="INACTIVE">নিষ্ক্রিয়</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="label">ড্রাইভিং লাইসেন্স নাম্বার</span>
              <input
                className="field"
                value={form.drivingLicenseNumber}
                onChange={(event) => setField('drivingLicenseNumber', event.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="label">মোটরসাইকেল রেজিস্ট্রেশন নাম্বার</span>
              <input
                className="field"
                value={form.motorcycleRegistrationNumber}
                onChange={(event) => setField('motorcycleRegistrationNumber', event.target.value)}
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="label">মোটরসাইকেলের মডেল</span>
              <input className="field" value={form.motorcycleModel} onChange={(event) => setField('motorcycleModel', event.target.value)} />
            </label>
            {updateMutation.error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-ember sm:col-span-2">
                {updateMutation.error.message}
              </p>
            ) : null}
          </div>
        ) : (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="label">ফোন</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(member.phone)}</dd>
            </div>
            <div>
              <dt className="label">ড্রাইভিং লাইসেন্স</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(member.drivingLicenseNumber)}</dd>
            </div>
            <div>
              <dt className="label">বাইক রেজিস্ট্রেশন</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(member.motorcycleRegistrationNumber)}</dd>
            </div>
            <div>
              <dt className="label">বাইক মডেল</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(member.motorcycleModel)}</dd>
            </div>
            <div>
              <dt className="label">রেজিস্ট্রেশন</dt>
              <dd className="mt-1 font-semibold">{dateText(member.createdAt)}</dd>
            </div>
            <div>
              <dt className="label">যুক্ত ট্যুর</dt>
              <dd className="mt-1 font-semibold">{member._count?.tourMembers ?? 0}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-bold">সাম্প্রতিক ট্যুর হিস্ট্রি</h2>
            <p className="text-sm text-slate-600">এই মেম্বার যেসব ট্যুরে যুক্ত ছিল।</p>
          </div>
          <Link className="font-semibold text-river" href={`/members/${member.id}/tours`}>
            সব দেখুন
          </Link>
        </div>
        {member.tourMembers?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3">ট্যুর</th>
                  <th className="px-4 py-3">রুট</th>
                  <th className="px-4 py-3">শুরু</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3">মেম্বার স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {member.tourMembers.slice(0, 5).map((history) => (
                  <tr key={history.id} className="hover:bg-slate-50">
                    <td className="table-cell" data-label="ট্যুর">
                      <Link className="font-semibold text-river" href={`/tours/${history.tour.id}`}>
                        {history.tour.title}
                      </Link>
                    </td>
                    <td className="table-cell" data-label="রুট">{routeText(history.tour)}</td>
                    <td className="table-cell" data-label="শুরু">{dateText(history.tour.startDate)}</td>
                    <td className="table-cell" data-label="ট্যুর স্ট্যাটাস">
                      <StatusBadge value={history.tour.status} />
                    </td>
                    <td className="table-cell" data-label="মেম্বার স্ট্যাটাস">
                      <StatusBadge value={history.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-600">এই মেম্বার এখনও কোনো ট্যুরে যুক্ত হয়নি।</p>
        )}
      </section>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="মেম্বার ডিলিট করবেন?"
        message={
          <>
            <strong>{member.name}</strong> মেম্বারকে ডিলিট করলে তার অ্যাকাউন্ট আর সাধারণ তালিকায় দেখা যাবে না।
            পুরনো ট্যুরের হিসাব সংরক্ষিত থাকবে।
          </>
        }
        confirmLabel="হ্যাঁ, মেম্বার ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteMember}
      />
    </div>
  );
}
