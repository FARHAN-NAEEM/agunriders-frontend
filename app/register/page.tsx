'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, setSession } from '@/lib/api';
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from '@/lib/image';
import type { Session } from '@/lib/types';

const schema = z.object({
  name: z.string().min(2, 'নাম দিন'),
  email: z.string().email('সঠিক ইমেইল দিন'),
  phone: z.string().optional(),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে'),
  avatarUrl: z.string().optional(),
  drivingLicenseNumber: z.string().optional(),
  motorcycleRegistrationNumber: z.string().optional(),
  motorcycleModel: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const avatarPreview = watch('avatarUrl');

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError('');

    if (!file) {
      setValue('avatarUrl', '');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError(`ছবির সাইজ সর্বোচ্চ ${MAX_IMAGE_SIZE_LABEL} হতে পারবে`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValue('avatarUrl', String(reader.result), { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(values: FormData) {
    setError('');

    try {
      const session = await apiFetch<Session>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
        skipAuth: true,
      });
      setSession(session);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
    }
  }

  return (
    <section className="surface w-full max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Image
          alt="Agun Riders"
          className="h-14 w-14 rounded-lg border border-orange-200 object-cover shadow-sm"
          height={56}
          priority
          src="/agun-riders-logo.png"
          width={56}
        />
        <div>
          <p className="text-sm font-semibold text-river">আগুন রাইডার্স</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">অ্যাকাউন্ট তৈরি করুন</h1>
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('avatarUrl')} />

        <div className="sm:col-span-2">
          <span className="label">মেম্বারের ছবি</span>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-line bg-slate-50">
              {avatarPreview ? (
                <img alt="মেম্বার" className="h-full w-full object-cover" src={avatarPreview} />
              ) : (
                <Camera className="text-slate-400" size={28} aria-hidden="true" />
              )}
            </div>
            <label className="btn-secondary cursor-pointer">
              <Camera size={16} aria-hidden="true" />
              ছবি নির্বাচন
              <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
            </label>
            <p className="text-xs text-slate-500">ঐচ্ছিক, সর্বোচ্চ {MAX_IMAGE_SIZE_LABEL}</p>
          </div>
          {imageError ? <span className="mt-2 block text-xs text-ember">{imageError}</span> : null}
        </div>

        <label className="block space-y-1 sm:col-span-2">
          <span className="label">নাম</span>
          <input className="field" {...register('name')} />
          {errors.name ? <span className="text-xs text-ember">{errors.name.message}</span> : null}
        </label>

        <label className="block space-y-1">
          <span className="label">ইমেইল</span>
          <input className="field" type="email" {...register('email')} />
          {errors.email ? <span className="text-xs text-ember">{errors.email.message}</span> : null}
        </label>

        <label className="block space-y-1">
          <span className="label">ফোন</span>
          <input className="field" {...register('phone')} />
        </label>

        <label className="block space-y-1">
          <span className="label">ড্রাইভিং লাইসেন্স নাম্বার</span>
          <input className="field" {...register('drivingLicenseNumber')} />
        </label>

        <label className="block space-y-1">
          <span className="label">মোটরসাইকেল রেজিস্ট্রেশন নাম্বার</span>
          <input className="field" {...register('motorcycleRegistrationNumber')} />
        </label>

        <label className="block space-y-1">
          <span className="label">মোটরসাইকেলের মডেল</span>
          <input className="field" {...register('motorcycleModel')} />
        </label>

        <label className="block space-y-1">
          <span className="label">পাসওয়ার্ড</span>
          <input className="field" type="password" {...register('password')} />
          {errors.password ? <span className="text-xs text-ember">{errors.password.message}</span> : null}
        </label>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-ember sm:col-span-2">{error}</p> : null}

        <button className="btn-primary sm:col-span-2" disabled={isSubmitting} type="submit">
          <UserPlus size={18} aria-hidden="true" />
          {isSubmitting ? 'তৈরি হচ্ছে...' : 'রেজিস্টার'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        আগে থেকেই অ্যাকাউন্ট আছে?{' '}
        <Link className="font-semibold text-river" href="/login">
          লগইন
        </Link>
      </p>
    </section>
  );
}
