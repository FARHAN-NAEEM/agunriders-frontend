'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, HandCoins, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TourTabs } from '@/components/tour-tabs';
import { apiFetch, dateText, money } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import { bnLabel, loanTypeLabel } from '@/lib/i18n';
import type { Loan, LoanType, TourMember } from '@/lib/types';

const schema = z.object({
  lenderId: z.string().min(1),
  borrowerId: z.string().optional(),
  amount: z.coerce.number().min(0.01),
  loanType: z.enum(['TOUR_FUND', 'MEMBER_TO_MEMBER']),
  reason: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type InlineLoanDraft = {
  lenderId: string;
  borrowerId?: string;
  amount: string;
  loanType: LoanType;
  reason: string;
};

export default function LoansPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<InlineLoanDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
  const { data: members = [] } = useQuery({
    queryKey: ['members', tourId],
    queryFn: () => apiFetch<TourMember[]>(`/tours/${tourId}/members`),
    enabled: ready && Boolean(session && tourId),
  });
  const { data: loans = [] } = useQuery({
    queryKey: ['loans', tourId],
    queryFn: () => apiFetch<Loan[]>(`/tours/${tourId}/loans`),
    enabled: ready && Boolean(session && tourId),
  });
  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { loanType: 'MEMBER_TO_MEMBER', reason: '' },
  });
  const loanType = useWatch({ control: form.control, name: 'loanType' });
  const isTourFundLoan = loanType === 'TOUR_FUND';
  const addMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<Loan>(`/tours/${tourId}/loans`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          borrowerId: values.loanType === 'TOUR_FUND' ? undefined : values.borrowerId,
        }),
      }),
    onSuccess: () => {
      resetAddForm();
      setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: ['loans', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: InlineLoanDraft }) =>
      apiFetch<Loan>(`/loans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          lenderId: draft.lenderId,
          borrowerId: draft.loanType === 'TOUR_FUND' ? undefined : draft.borrowerId,
          amount: Number(draft.amount),
          loanType: draft.loanType,
          reason: draft.reason,
        }),
      }),
    onSuccess: () => {
      setEditingLoanId(null);
      setEditDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['loans', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/loans/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loans', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });

  useEffect(() => {
    if (activeMembers.length) {
      form.setValue('lenderId', activeMembers[0].userId);
      form.setValue('borrowerId', activeMembers[1]?.userId ?? activeMembers[0].userId);
    }
  }, [activeMembers, form]);

  if (!ready || !session) {
    return null;
  }

  function resetAddForm() {
    form.reset({
      loanType: 'MEMBER_TO_MEMBER',
      lenderId: activeMembers[0]?.userId,
      borrowerId: activeMembers[1]?.userId ?? activeMembers[0]?.userId,
      reason: '',
    });
  }

  function startInlineEdit(loan: Loan) {
    setShowAddForm(false);
    setEditingLoanId(loan.id);
    setEditDraft({
      lenderId: loan.lenderId,
      borrowerId: loan.borrowerId ?? undefined,
      amount: String(Number(loan.amount)),
      loanType: loan.loanType,
      reason: loan.reason ?? '',
    });
  }

  function cancelInlineEdit() {
    setEditingLoanId(null);
    setEditDraft(null);
  }

  function patchEditDraft(patch: Partial<InlineLoanDraft>) {
    setEditDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function updateDraftLoanType(nextType: LoanType) {
    setEditDraft((current) => {
      if (!current) {
        return current;
      }

      if (nextType === 'TOUR_FUND') {
        return { ...current, loanType: nextType, borrowerId: undefined };
      }

      return {
        ...current,
        loanType: nextType,
        borrowerId:
          current.borrowerId ??
          activeMembers.find((member) => member.userId !== current.lenderId)?.userId ??
          activeMembers[0]?.userId,
      };
    });
  }

  function updateDraftLender(lenderId: string) {
    setEditDraft((current) => {
      if (!current) {
        return current;
      }

      const borrowerId =
        current.loanType === 'MEMBER_TO_MEMBER' && current.borrowerId === lenderId
          ? activeMembers.find((member) => member.userId !== lenderId)?.userId ?? current.borrowerId
          : current.borrowerId;

      return { ...current, lenderId, borrowerId };
    });
  }

  function saveInlineEdit() {
    if (!editingLoanId || !editDraft || !editDraft.lenderId || !editDraft.amount) {
      return;
    }

    if (editDraft.loanType === 'MEMBER_TO_MEMBER' && !editDraft.borrowerId) {
      return;
    }

    updateMutation.mutate({ id: editingLoanId, draft: editDraft });
  }

  function confirmDeleteLoan() {
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
        <h1 className="text-2xl font-bold text-ink">লোন</h1>
        <p className="text-sm text-slate-600">ট্যুর ফান্ড লোন এবং মেম্বার টু মেম্বার লোন খরচ থেকে আলাদা থাকবে।</p>
      </div>

      <TourTabs tourId={tourId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">লোন এন্ট্রি</h2>
          <p className="text-sm text-slate-600">ট্যুর ফান্ড বা অন্য মেম্বারকে দেওয়া টাকা রেকর্ড করুন।</p>
        </div>
        {session.user.role === 'ADMIN' && !showAddForm ? (
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              cancelInlineEdit();
              resetAddForm();
              setShowAddForm(true);
            }}
          >
            <Plus size={18} aria-hidden="true" />
            লোন যোগ করুন
          </button>
        ) : null}
      </div>

      {session.user.role === 'ADMIN' && showAddForm ? (
        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">লোন যোগ করুন</h2>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                resetAddForm();
                setShowAddForm(false);
              }}
            >
              <X size={16} aria-hidden="true" />
              বাতিল
            </button>
          </div>
          <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}>
            <label className="block space-y-1">
              <span className="label">লোনের ধরন</span>
              <select className="field" {...form.register('loanType')}>
                <option value="MEMBER_TO_MEMBER">মেম্বার টু মেম্বার লোন</option>
                <option value="TOUR_FUND">ট্যুর ফান্ড লোন</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="label">{isTourFundLoan ? 'ফান্ড দিয়েছে' : 'টাকা দিয়েছে'}</span>
              <select className="field" {...form.register('lenderId')}>
                {activeMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </label>

            {isTourFundLoan ? (
              <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 lg:col-span-2">
                <p className="text-sm font-semibold text-river">টাকা নিয়েছে: ট্যুর ফান্ড</p>
                <p className="mt-1 text-sm text-slate-600">
                  এই টাকা ট্যুর ফান্ডে যাবে এবং যে মেম্বার দিয়েছে তার পাওনা হিসেবে থাকবে।
                </p>
              </div>
            ) : (
              <label className="block space-y-1">
                <span className="label">টাকা নিয়েছে</span>
                <select className="field" {...form.register('borrowerId')}>
                  {activeMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block space-y-1">
              <span className="label">লোনের পরিমাণ</span>
              <input className="field" min="0" placeholder="টাকার পরিমাণ" step="0.01" type="number" {...form.register('amount')} />
            </label>

            <label className="block space-y-1 lg:col-span-2">
              <span className="label">কারণ / নোট</span>
              <input className="field" placeholder="কেন এই লোন দেওয়া হয়েছে" {...form.register('reason')} />
            </label>

            {addMutation.error ? <p className="text-sm text-ember lg:col-span-2">{addMutation.error.message}</p> : null}

            <button className="btn-primary lg:col-span-2" disabled={addMutation.isPending} type="submit">
              <HandCoins size={18} aria-hidden="true" />
              {addMutation.isPending ? 'সেভ হচ্ছে...' : 'লোন সেভ করুন'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3">ধরন</th>
                <th className="px-4 py-3">টাকা দিয়েছে</th>
                <th className="px-4 py-3">টাকা নিয়েছে / ফান্ড</th>
                <th className="px-4 py-3">পরিমাণ</th>
                <th className="px-4 py-3">কারণ</th>
                <th className="px-4 py-3">তারিখ</th>
                {session.user.role === 'ADMIN' ? <th className="px-4 py-3">অ্যাকশন</th> : null}
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-600" colSpan={session.user.role === 'ADMIN' ? 7 : 6}>
                    এখনও কোনো লোন যোগ করা হয়নি। কেউ ট্যুর ফান্ড বা অন্য মেম্বারকে টাকা দিলে “লোন যোগ করুন” ব্যবহার করুন।
                  </td>
                </tr>
              ) : null}
              {loans.map((loan) => {
                const isEditing = editingLoanId === loan.id && editDraft;

                return (
                  <tr key={loan.id} className={isEditing ? 'bg-teal-50/40 align-top' : 'hover:bg-slate-50'}>
                    <td className="table-cell" data-label="ধরন">
                      {isEditing ? (
                        <select
                          className="field min-w-52"
                          value={editDraft.loanType}
                          onChange={(event) => updateDraftLoanType(event.target.value as LoanType)}
                        >
                          <option value="MEMBER_TO_MEMBER">মেম্বার টু মেম্বার লোন</option>
                          <option value="TOUR_FUND">ট্যুর ফান্ড লোন</option>
                        </select>
                      ) : (
                        bnLabel(loan.loanType, loanTypeLabel)
                      )}
                    </td>
                    <td className="table-cell" data-label="টাকা দিয়েছে">
                      {isEditing ? (
                        <label className="block min-w-48 space-y-1">
                          <span className="label">টাকা দিয়েছে</span>
                          <select className="field" value={editDraft.lenderId} onChange={(event) => updateDraftLender(event.target.value)}>
                            {activeMembers.map((member) => (
                              <option key={member.userId} value={member.userId}>
                                {member.user.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span className="font-semibold">{loan.lender.name}</span>
                      )}
                    </td>
                    <td className="table-cell" data-label="টাকা নিয়েছে / ফান্ড">
                      {isEditing ? (
                        editDraft.loanType === 'TOUR_FUND' ? (
                          <div className="min-w-44 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-river">
                            টাকা নিয়েছে: ট্যুর ফান্ড
                          </div>
                        ) : (
                          <label className="block min-w-48 space-y-1">
                            <span className="label">টাকা নিয়েছে</span>
                            <select
                              className="field"
                              value={editDraft.borrowerId ?? ''}
                              onChange={(event) => patchEditDraft({ borrowerId: event.target.value })}
                            >
                              {activeMembers.map((member) => (
                                <option key={member.userId} value={member.userId}>
                                  {member.user.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <ArrowRight size={15} className="text-river" aria-hidden="true" />
                          <span className="font-semibold">{loan.borrower?.name ?? 'ট্যুর ফান্ড'}</span>
                        </span>
                      )}
                    </td>
                    <td className="table-cell" data-label="পরিমাণ">
                      {isEditing ? (
                        <label className="block min-w-36 space-y-1">
                          <span className="label">পরিমাণ</span>
                          <input
                            className="field"
                            min="0"
                            step="0.01"
                            type="number"
                            value={editDraft.amount}
                            onChange={(event) => patchEditDraft({ amount: event.target.value })}
                          />
                        </label>
                      ) : (
                        money(loan.amount)
                      )}
                    </td>
                    <td className="table-cell" data-label="কারণ">
                      {isEditing ? (
                        <label className="block min-w-56 space-y-1">
                          <span className="label">কারণ / নোট</span>
                          <input
                            className="field"
                            placeholder="কারণ"
                            value={editDraft.reason}
                            onChange={(event) => patchEditDraft({ reason: event.target.value })}
                          />
                        </label>
                      ) : (
                        loan.reason ?? '-'
                      )}
                    </td>
                    <td className="table-cell" data-label="তারিখ">{dateText(loan.createdAt)}</td>
                    {session.user.role === 'ADMIN' ? (
                      <td className="table-cell" data-label="অ্যাকশন">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="btn-primary"
                              disabled={
                                updateMutation.isPending ||
                                !editDraft.amount ||
                                !editDraft.lenderId ||
                                (editDraft.loanType === 'MEMBER_TO_MEMBER' && !editDraft.borrowerId)
                              }
                              type="button"
                              onClick={saveInlineEdit}
                            >
                              <Check size={15} aria-hidden="true" />
                              সেভ
                            </button>
                            <button className="btn-secondary" type="button" onClick={cancelInlineEdit}>
                              <X size={15} aria-hidden="true" />
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-secondary" type="button" onClick={() => startInlineEdit(loan)}>
                              <Pencil size={15} aria-hidden="true" />
                              এডিট
                            </button>
                            <button
                              className="btn-danger"
                              disabled={deleteMutation.isPending}
                              type="button"
                              onClick={() => setDeleteTarget(loan)}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              ডিলিট
                            </button>
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="লোন ডিলিট করবেন?"
        message={
          <>
            <strong>{deleteTarget?.lender.name}</strong> থেকে দেওয়া {deleteTarget ? money(deleteTarget.amount) : ''} লোনটি
            ডিলিট হলে এর auto settlement item-ও হিসাব থেকে বাদ যাবে।
          </>
        }
        confirmLabel="হ্যাঁ, লোন ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteLoan}
      />
    </div>
  );
}
