'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckSquare, Pencil, Plus, ReceiptText, Square, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TourTabs } from '@/components/tour-tabs';
import { apiFetch, dateText, money } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import { bnLabel, categoryLabel } from '@/lib/i18n';
import type { Expense, TourMember } from '@/lib/types';

const categories = ['Food', 'Hotel', 'Transport', 'Ticket', 'Fuel', 'Shopping', 'Emergency', 'Other'];
const schema = z.object({
  title: z.string().min(2),
  amount: z.coerce.number().min(0.01),
  paidById: z.string().min(1),
  category: z.string().min(1),
  expenseDate: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type InlineExpenseDraft = {
  title: string;
  amount: string;
  paidById: string;
  category: string;
  expenseDate: string;
  description: string;
  memberIds: string[];
};

export default function ExpensesPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSelectedIds, setAddSelectedIds] = useState<string[]>([]);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<InlineExpenseDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const { data: members = [] } = useQuery({
    queryKey: ['members', tourId],
    queryFn: () => apiFetch<TourMember[]>(`/tours/${tourId}/members`),
    enabled: ready && Boolean(session && tourId),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', tourId],
    queryFn: () => apiFetch<Expense[]>(`/tours/${tourId}/expenses`),
    enabled: ready && Boolean(session && tourId),
  });
  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'Food',
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });
  const addAmount = useWatch({ control: form.control, name: 'amount' });
  const addSharePreview = addSelectedIds.length ? Number(addAmount || 0) / addSelectedIds.length : 0;
  const addMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<Expense>(`/tours/${tourId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          splitType: 'EQUAL',
          members: addSelectedIds.map((userId) => ({ userId })),
        }),
      }),
    onSuccess: () => {
      form.reset({
        category: 'Food',
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      setAddSelectedIds(activeMembers.map((member) => member.userId));
      setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: ['expenses', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: InlineExpenseDraft }) =>
      apiFetch<Expense>(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: draft.title,
          amount: Number(draft.amount),
          paidById: draft.paidById,
          category: draft.category,
          expenseDate: draft.expenseDate,
          description: draft.description,
          splitType: 'EQUAL',
          members: draft.memberIds.map((userId) => ({ userId })),
        }),
      }),
    onSuccess: () => {
      setEditingExpenseId(null);
      setEditDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['expenses', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/expenses/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });

  useEffect(() => {
    if (activeMembers.length && addSelectedIds.length === 0) {
      setAddSelectedIds(activeMembers.map((member) => member.userId));
      form.setValue('paidById', activeMembers[0].userId);
    }
  }, [activeMembers, addSelectedIds.length, form]);

  if (!ready || !session) {
    return null;
  }

  function toggleAddMember(userId: string) {
    setAddSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function startInlineEdit(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditDraft({
      title: expense.title,
      amount: String(Number(expense.amount)),
      paidById: expense.paidById,
      category: expense.category,
      expenseDate: new Date(expense.expenseDate).toISOString().slice(0, 10),
      description: expense.description ?? '',
      memberIds: expense.members.map((member) => member.userId),
    });
  }

  function updateDraft<K extends keyof InlineExpenseDraft>(key: K, value: InlineExpenseDraft[K]) {
    setEditDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggleEditMember(userId: string) {
    setEditDraft((current) => {
      if (!current) {
        return current;
      }

      const memberIds = current.memberIds.includes(userId)
        ? current.memberIds.filter((id) => id !== userId)
        : [...current.memberIds, userId];

      return { ...current, memberIds };
    });
  }

  function editableMembers(memberIds: string[]) {
    return members.filter((member) => member.isActive || memberIds.includes(member.userId));
  }

  function cancelInlineEdit() {
    setEditingExpenseId(null);
    setEditDraft(null);
  }

  function saveInlineEdit() {
    if (!editingExpenseId || !editDraft || editDraft.memberIds.length === 0) {
      return;
    }

    updateMutation.mutate({ id: editingExpenseId, draft: editDraft });
  }

  function confirmDeleteExpense() {
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
        <h1 className="text-2xl font-bold text-ink">খরচ</h1>
        <p className="text-sm text-slate-600">ইকুয়াল স্প্লিট এন্ট্রি এবং লাইভ মেম্বার শেয়ার প্রিভিউ।</p>
      </div>

      <TourTabs tourId={tourId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">খরচের এন্ট্রি</h2>
          <p className="text-sm text-slate-600">গ্রুপের জন্য কেউ টাকা দিলে এখানে খরচ যোগ করুন।</p>
        </div>
        {session.user.role === 'ADMIN' && !showAddForm ? (
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              cancelInlineEdit();
              setShowAddForm(true);
            }}
          >
            <Plus size={18} aria-hidden="true" />
            খরচ যোগ করুন
          </button>
        ) : null}
      </div>

      {session.user.role === 'ADMIN' && showAddForm ? (
        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">খরচ যোগ করুন</h2>
            <button className="btn-secondary" type="button" onClick={() => setShowAddForm(false)}>
              <X size={16} aria-hidden="true" />
              বাতিল
            </button>
          </div>
          <form className="mt-4 grid gap-4 lg:grid-cols-4" onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}>
            <input className="field lg:col-span-2" placeholder="খরচের নাম" {...form.register('title')} />
            <input className="field" min="0" placeholder="টাকার পরিমাণ" step="0.01" type="number" {...form.register('amount')} />
            <select className="field" {...form.register('paidById')}>
              <option value="">কে পেমেন্ট করেছে</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user.name}
                </option>
              ))}
            </select>
            <select className="field" {...form.register('category')}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {bnLabel(category, categoryLabel)}
                </option>
              ))}
            </select>
            <input className="field" type="date" {...form.register('expenseDate')} />
            <input className="field lg:col-span-2" placeholder="বর্ণনা" {...form.register('description')} />

            <div className="lg:col-span-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="label">যাদের মধ্যে ভাগ হবে</span>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => setAddSelectedIds(activeMembers.map((member) => member.userId))}
                  >
                    <CheckSquare size={16} aria-hidden="true" />
                    সবাই সিলেক্ট
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setAddSelectedIds([])}>
                    <Square size={16} aria-hidden="true" />
                    ক্লিয়ার
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {activeMembers.map((member) => (
                  <label key={member.userId} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        checked={addSelectedIds.includes(member.userId)}
                        type="checkbox"
                        onChange={() => toggleAddMember(member.userId)}
                      />
                      {member.user.name}
                    </span>
                    <span className="font-semibold text-river">{money(addSharePreview)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 lg:col-span-4">
              সিলেক্টেড {addSelectedIds.length} জন, প্রত্যেকের শেয়ার {money(addSharePreview)}
            </div>

            {addMutation.error ? <p className="text-sm text-ember lg:col-span-4">{addMutation.error.message}</p> : null}

            <button className="btn-primary lg:col-span-4" disabled={addMutation.isPending || addSelectedIds.length === 0} type="submit">
              <ReceiptText size={18} aria-hidden="true" />
              {addMutation.isPending ? 'সেভ হচ্ছে...' : 'খরচ সেভ করুন'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3">শিরোনাম</th>
                <th className="px-4 py-3">পরিমাণ</th>
                <th className="px-4 py-3">পেমেন্ট করেছে</th>
                <th className="px-4 py-3">ক্যাটাগরি</th>
                <th className="px-4 py-3">তারিখ</th>
                <th className="px-4 py-3">মেম্বার</th>
                {session.user.role === 'ADMIN' ? <th className="px-4 py-3">অ্যাকশন</th> : null}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-600" colSpan={session.user.role === 'ADMIN' ? 7 : 6}>
                    এখনও কোনো খরচ যোগ করা হয়নি। ট্যুরের কোনো খরচ হলে “খরচ যোগ করুন” ব্যবহার করুন।
                  </td>
                </tr>
              ) : null}
              {expenses.map((expense) => {
                const isEditing = editingExpenseId === expense.id && editDraft;
                const editSharePreview =
                  editDraft?.memberIds.length && isEditing
                    ? Number(editDraft.amount || 0) / editDraft.memberIds.length
                    : 0;

                return (
                  <tr key={expense.id} className={isEditing ? 'bg-teal-50/40 align-top' : 'hover:bg-slate-50'}>
                    <td className="table-cell font-semibold" data-label="শিরোনাম">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            className="field min-w-44"
                            value={editDraft.title}
                            onChange={(event) => updateDraft('title', event.target.value)}
                          />
                          <input
                            className="field min-w-44"
                            placeholder="বর্ণনা"
                            value={editDraft.description}
                            onChange={(event) => updateDraft('description', event.target.value)}
                          />
                        </div>
                      ) : (
                        expense.title
                      )}
                    </td>
                    <td className="table-cell" data-label="পরিমাণ">
                      {isEditing ? (
                        <input
                          className="field min-w-32"
                          min="0"
                          step="0.01"
                          type="number"
                          value={editDraft.amount}
                          onChange={(event) => updateDraft('amount', event.target.value)}
                        />
                      ) : (
                        money(expense.amount)
                      )}
                    </td>
                    <td className="table-cell" data-label="পেমেন্ট করেছে">
                      {isEditing ? (
                        <select
                          className="field min-w-44"
                          value={editDraft.paidById}
                          onChange={(event) => updateDraft('paidById', event.target.value)}
                        >
                          {members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.user.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        expense.paidBy.name
                      )}
                    </td>
                    <td className="table-cell" data-label="ক্যাটাগরি">
                      {isEditing ? (
                        <select
                          className="field min-w-36"
                          value={editDraft.category}
                          onChange={(event) => updateDraft('category', event.target.value)}
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {bnLabel(category, categoryLabel)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        bnLabel(expense.category, categoryLabel)
                      )}
                    </td>
                    <td className="table-cell" data-label="তারিখ">
                      {isEditing ? (
                        <input
                          className="field min-w-40"
                          type="date"
                          value={editDraft.expenseDate}
                          onChange={(event) => updateDraft('expenseDate', event.target.value)}
                        />
                      ) : (
                        dateText(expense.expenseDate)
                      )}
                    </td>
                    <td className="table-cell" data-label="মেম্বার">
                      {isEditing ? (
                        <div className="min-w-64 space-y-2">
                          <div className="grid gap-2">
                            {editableMembers(editDraft.memberIds).map((member) => (
                              <label key={member.userId} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
                                <span className="flex items-center gap-2">
                                  <input
                                    checked={editDraft.memberIds.includes(member.userId)}
                                    type="checkbox"
                                    onChange={() => toggleEditMember(member.userId)}
                                  />
                                  {member.user.name}
                                </span>
                                <span className="font-semibold text-river">{money(editSharePreview)}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs font-semibold text-slate-600">
                            {editDraft.memberIds.length} জন সিলেক্টেড, প্রত্যেকে {money(editSharePreview)}
                          </p>
                        </div>
                      ) : (
                        expense.members.length
                      )}
                    </td>
                    {session.user.role === 'ADMIN' ? (
                      <td className="table-cell" data-label="অ্যাকশন">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="btn-primary"
                              disabled={updateMutation.isPending || editDraft.memberIds.length === 0}
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
                            <button className="btn-secondary" type="button" onClick={() => startInlineEdit(expense)}>
                              <Pencil size={15} aria-hidden="true" />
                              এডিট
                            </button>
                            <button
                              className="btn-danger"
                              disabled={deleteMutation.isPending}
                              type="button"
                              onClick={() => setDeleteTarget(expense)}
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
        title="খরচ ডিলিট করবেন?"
        message={
          <>
            <strong>{deleteTarget?.title}</strong> খরচটি ডিলিট হলে এই খরচের member share এবং related settlement আবার হিসাব হবে।
          </>
        }
        confirmLabel="হ্যাঁ, খরচ ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteExpense}
      />
    </div>
  );
}
