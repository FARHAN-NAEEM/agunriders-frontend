'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Pencil, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { apiFetch, clearSession, dateText, routeText, setSession } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from '@/lib/image';
import type { Tour, User } from '@/lib/types';

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  drivingLicenseNumber: string;
  motorcycleRegistrationNumber: string;
  motorcycleModel: string;
};

const emptyForm: ProfileForm = {
  name: '',
  email: '',
  phone: '',
  avatarUrl: '',
  drivingLicenseNumber: '',
  motorcycleRegistrationNumber: '',
  motorcycleModel: '',
};

function fromUser(user?: User | null): ProfileForm {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    avatarUrl: user?.avatarUrl ?? '',
    drivingLicenseNumber: user?.drivingLicenseNumber ?? '',
    motorcycleRegistrationNumber: user?.motorcycleRegistrationNumber ?? '',
    motorcycleModel: user?.motorcycleModel ?? '',
  };
}

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

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [imageError, setImageError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<User>('/auth/profile'),
    enabled: ready && Boolean(session),
  });
  const { data: tours = [] } = useQuery({
    queryKey: ['tours'],
    queryFn: () => apiFetch<Tour[]>('/tours'),
    enabled: ready && Boolean(session),
  });
  const updateMutation = useMutation({
    mutationFn: (values: ProfileForm) =>
      apiFetch<User>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: (updated) => {
      if (session) {
        setSession({ ...session, user: updated });
      }

      setEditing(false);
      setForm(fromUser(updated));
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['system-members'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => apiFetch<{ message: string }>('/auth/profile', { method: 'DELETE' }),
    onSuccess: () => {
      clearSession();
      router.replace('/login');
    },
  });

  useEffect(() => {
    if (profile) {
      setForm(fromUser(profile));
    } else if (session?.user) {
      setForm(fromUser(session.user));
    }
  }, [profile, session?.user]);

  if (!ready || !session) {
    return null;
  }

  const currentUser = profile ?? session.user;

  function setField(field: keyof ProfileForm, value: string) {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">প্রোফাইল</h1>
          <p className="text-sm text-slate-600">আপনার অ্যাকাউন্ট তথ্য, বাইকের তথ্য এবং ট্যুর রিপোর্ট।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button className="btn-primary" disabled={updateMutation.isPending} type="button" onClick={() => updateMutation.mutate(form)}>
                <Save size={16} aria-hidden="true" />
                {updateMutation.isPending ? 'সেভ হচ্ছে...' : 'সেভ'}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm(fromUser(currentUser));
                }}
              >
                <X size={16} aria-hidden="true" />
                বাতিল
              </button>
            </>
          ) : (
            <button className="btn-secondary" type="button" onClick={() => setEditing(true)}>
              <Pencil size={16} aria-hidden="true" />
              এডিট
            </button>
          )}
          <button className="btn-danger" disabled={deleteMutation.isPending} type="button" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 size={16} aria-hidden="true" />
            ডিলিট
          </button>
        </div>
      </div>

      <section className="surface p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-orange-50 text-xl font-bold text-river">
            {(editing ? form.avatarUrl : currentUser.avatarUrl) ? (
              <img
                alt={currentUser.name}
                className="h-full w-full object-cover"
                src={editing ? form.avatarUrl : currentUser.avatarUrl ?? ''}
              />
            ) : (
              initials(currentUser.name)
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">{currentUser.name}</h2>
            <p className="text-sm text-slate-600">{currentUser.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={currentUser.role} />
              <StatusBadge value={currentUser.status ?? 'ACTIVE'} />
            </div>
          </div>
        </div>

        {editing ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="label">প্রোফাইল ছবি</span>
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
              <span className="label">ড্রাইভিং লাইসেন্স</span>
              <input
                className="field"
                value={form.drivingLicenseNumber}
                onChange={(event) => setField('drivingLicenseNumber', event.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="label">বাইক রেজিস্ট্রেশন</span>
              <input
                className="field"
                value={form.motorcycleRegistrationNumber}
                onChange={(event) => setField('motorcycleRegistrationNumber', event.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="label">বাইক মডেল</span>
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
              <dt className="label">নাম</dt>
              <dd className="mt-1 font-semibold">{currentUser.name}</dd>
            </div>
            <div>
              <dt className="label">ইমেইল</dt>
              <dd className="mt-1 font-semibold">{currentUser.email}</dd>
            </div>
            <div>
              <dt className="label">ফোন</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(currentUser.phone)}</dd>
            </div>
            <div>
              <dt className="label">রেজিস্ট্রেশন</dt>
              <dd className="mt-1 font-semibold">{dateText(currentUser.createdAt)}</dd>
            </div>
            <div>
              <dt className="label">ড্রাইভিং লাইসেন্স</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(currentUser.drivingLicenseNumber)}</dd>
            </div>
            <div>
              <dt className="label">বাইক রেজিস্ট্রেশন</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(currentUser.motorcycleRegistrationNumber)}</dd>
            </div>
            <div>
              <dt className="label">বাইক মডেল</dt>
              <dd className="mt-1 font-semibold">{valueOrUnset(currentUser.motorcycleModel)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-bold">আমার ট্যুর</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3">ট্যুর</th>
                <th className="px-4 py-3">রুট</th>
                <th className="px-4 py-3">শুরু</th>
                <th className="px-4 py-3">স্ট্যাটাস</th>
                <th className="px-4 py-3">রিপোর্ট</th>
              </tr>
            </thead>
            <tbody>
              {tours.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-600" colSpan={5}>
                    এখনো কোনো ট্যুর নেই।
                  </td>
                </tr>
              ) : null}
              {tours.map((tour) => (
                <tr key={tour.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold" data-label="ট্যুর">{tour.title}</td>
                  <td className="table-cell" data-label="রুট">{routeText(tour)}</td>
                  <td className="table-cell" data-label="শুরু">{dateText(tour.startDate)}</td>
                  <td className="table-cell" data-label="স্ট্যাটাস">
                    <StatusBadge value={tour.status} />
                  </td>
                  <td className="table-cell" data-label="রিপোর্ট">
                    <Link className="font-semibold text-river" href={`/tours/${tour.id}/report`}>
                      রিপোর্ট দেখুন
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="নিজের অ্যাকাউন্ট ডিলিট করবেন?"
        message={
          <>
            <strong>{currentUser.name}</strong> অ্যাকাউন্ট ডিলিট করলে এই সেশন বন্ধ হয়ে যাবে। আপনি যদি শেষ অ্যাডমিন হন,
            সিস্টেম নিরাপত্তার জন্য delete করতে দেবে না।
          </>
        }
        confirmLabel="হ্যাঁ, অ্যাকাউন্ট ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
