'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, setSession } from '@/lib/api';
import type { Session } from '@/lib/types';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormData) {
    setError('');

    try {
      const session = await apiFetch<Session>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
        skipAuth: true,
      });
      setSession(session);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে');
    }
  }

  return (
    <section className="surface w-full max-w-md p-6">
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
          <h1 className="mt-1 text-2xl font-bold text-ink">লগইন</h1>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block space-y-1">
          <span className="label">ইমেইল</span>
          <input className="field" type="email" {...register('email')} />
          {errors.email ? <span className="text-xs text-ember">{errors.email.message}</span> : null}
        </label>

        <label className="block space-y-1">
          <span className="label">পাসওয়ার্ড</span>
          <input className="field" type="password" {...register('password')} />
          {errors.password ? <span className="text-xs text-ember">{errors.password.message}</span> : null}
        </label>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-ember">{error}</p> : null}

        <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
          <LogIn size={18} aria-hidden="true" />
          {isSubmitting ? 'লগইন হচ্ছে...' : 'লগইন'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        নতুন ব্যবহারকারী?{' '}
        <Link className="font-semibold text-river" href="/register">
          অ্যাকাউন্ট তৈরি করুন
        </Link>
      </p>
    </section>
  );
}
