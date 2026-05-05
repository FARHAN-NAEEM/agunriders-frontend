'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { Tour } from '@/lib/types';

const schema = z.object({
  title: z.string().min(2, 'ট্যুরের নাম দিন'),
  startLocation: z.string().min(2, 'যাত্রা শুরুর স্থান দিন'),
  destination: z.string().min(2, 'গন্তব্য দিন'),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  estimatedBudget: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateTourPage() {
  const router = useRouter();
  const { session, ready } = useSessionGuard();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<Tour>('/tours', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: (tour) => router.push(`/tours/${tour.id}`),
  });

  if (!ready || !session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-river" href="/tours">
        <ArrowLeft size={16} aria-hidden="true" />
        ট্যুর তালিকায় ফিরুন
      </Link>

      <section className="surface p-5">
        <h1 className="text-2xl font-bold text-ink">ট্যুর তৈরি করুন</h1>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <label className="block space-y-1 sm:col-span-2">
            <span className="label">ট্যুরের নাম</span>
            <input className="field" {...register('title')} />
            {errors.title ? <span className="text-xs text-ember">{errors.title.message}</span> : null}
          </label>

          <label className="block space-y-1">
            <span className="label">যাত্রা শুরুর স্থান</span>
            <input className="field" placeholder="যেমন: ঢাকা" {...register('startLocation')} />
            {errors.startLocation ? <span className="text-xs text-ember">{errors.startLocation.message}</span> : null}
          </label>

          <label className="block space-y-1">
            <span className="label">গন্তব্য</span>
            <input className="field" placeholder="যেমন: সাজেক" {...register('destination')} />
            {errors.destination ? <span className="text-xs text-ember">{errors.destination.message}</span> : null}
          </label>

          <label className="block space-y-1">
            <span className="label">প্রতি মেম্বারের আনুমানিক বাজেট</span>
            <input className="field" min="0" step="0.01" type="number" placeholder="যেমন: 10000" {...register('estimatedBudget')} />
          </label>

          <label className="block space-y-1">
            <span className="label">শুরুর তারিখ</span>
            <input className="field" type="date" {...register('startDate')} />
          </label>

          <label className="block space-y-1">
            <span className="label">শেষ তারিখ</span>
            <input className="field" type="date" {...register('endDate')} />
          </label>

          <label className="block space-y-1 sm:col-span-2">
            <span className="label">বর্ণনা</span>
            <textarea className="field min-h-28" {...register('description')} />
          </label>

          {mutation.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-ember sm:col-span-2">
              {mutation.error.message}
            </p>
          ) : null}

          <button className="btn-primary sm:col-span-2" disabled={mutation.isPending} type="submit">
            <Save size={18} aria-hidden="true" />
            {mutation.isPending ? 'সেভ হচ্ছে...' : 'ট্যুর সেভ করুন'}
          </button>
        </form>
      </section>
    </div>
  );
}
