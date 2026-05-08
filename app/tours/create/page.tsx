'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  const [requirements, setRequirements] = useState(['']);
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
        body: JSON.stringify({
          ...values,
          requirements: requirements.map((item) => item.trim()).filter(Boolean),
        }),
      }),
    onSuccess: (tour) => router.push(`/tours/${tour.id}`),
  });

  function updateRequirement(index: number, value: string) {
    setRequirements((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addRequirement() {
    setRequirements((current) => [...current, '']);
  }

  function removeRequirement(index: number) {
    setRequirements((current) => (current.length === 1 ? [''] : current.filter((_, itemIndex) => itemIndex !== index)));
  }

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

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <span className="label">রিকোয়ারমেন্ট</span>
              <button className="btn-secondary" type="button" onClick={addRequirement} title="রিকোয়ারমেন্ট যোগ করুন">
                <Plus size={16} aria-hidden="true" />
                যোগ করুন
              </button>
            </div>
            <div className="space-y-2">
              {requirements.map((requirement, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <input
                    className="field"
                    placeholder={`রিকোয়ারমেন্ট ${index + 1}`}
                    value={requirement}
                    onChange={(event) => updateRequirement(index, event.target.value)}
                  />
                  <button
                    aria-label="রিকোয়ারমেন্ট বাদ দিন"
                    className="inline-grid h-11 w-11 place-items-center rounded-lg border border-line bg-white text-slate-600 transition hover:bg-red-50 hover:text-ember"
                    type="button"
                    onClick={() => removeRequirement(index)}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

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
