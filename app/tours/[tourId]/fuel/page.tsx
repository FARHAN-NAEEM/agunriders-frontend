'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Fuel, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TourTabs } from '@/components/tour-tabs';
import { apiFetch, dateText, money } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import type { FuelExpense, TourMember } from '@/lib/types';

const schema = z.object({
  vehicleName: z.string().min(2),
  driverId: z.string().min(1),
  paidById: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  fuelLiters: z.coerce.number().min(0).optional(),
  distance: z.coerce.number().min(0).optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type InlineFuelDraft = {
  vehicleName: string;
  driverId: string;
  paidById: string;
  amount: string;
  fuelLiters: string;
  distance: string;
  note: string;
  memberIds: string[];
};

export default function FuelPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSelectedIds, setAddSelectedIds] = useState<string[]>([]);
  const [editingFuelId, setEditingFuelId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<InlineFuelDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FuelExpense | null>(null);
  const { data: members = [] } = useQuery({
    queryKey: ['members', tourId],
    queryFn: () => apiFetch<TourMember[]>(`/tours/${tourId}/members`),
    enabled: ready && Boolean(session && tourId),
  });
  const { data: fuelExpenses = [] } = useQuery({
    queryKey: ['fuel', tourId],
    queryFn: () => apiFetch<FuelExpense[]>(`/tours/${tourId}/fuel-expenses`),
    enabled: ready && Boolean(session && tourId),
  });
  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const addAmount = useWatch({ control: form.control, name: 'amount' });
  const addSharePreview = addSelectedIds.length ? Number(addAmount || 0) / addSelectedIds.length : 0;
  const addMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<FuelExpense>(`/tours/${tourId}/fuel-expenses`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          fuelLiters: values.fuelLiters || undefined,
          distance: values.distance || undefined,
          members: addSelectedIds.map((userId) => ({ userId })),
        }),
      }),
    onSuccess: () => {
      form.reset();
      setAddSelectedIds(activeMembers.map((member) => member.userId));
      setShowAddForm(false);
      void queryClient.invalidateQueries({ queryKey: ['fuel', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: InlineFuelDraft }) =>
      apiFetch<FuelExpense>(`/fuel-expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          vehicleName: draft.vehicleName,
          driverId: draft.driverId,
          paidById: draft.paidById,
          amount: Number(draft.amount),
          fuelLiters: draft.fuelLiters ? Number(draft.fuelLiters) : undefined,
          distance: draft.distance ? Number(draft.distance) : undefined,
          note: draft.note,
          members: draft.memberIds.map((userId) => ({ userId })),
        }),
      }),
    onSuccess: () => {
      setEditingFuelId(null);
      setEditDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['fuel', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/fuel-expenses/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fuel', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });

  useEffect(() => {
    if (activeMembers.length && addSelectedIds.length === 0) {
      const ids = activeMembers.map((member) => member.userId);
      setAddSelectedIds(ids);
      form.setValue('driverId', ids[0]);
      form.setValue('paidById', ids[0]);
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

  function startInlineEdit(fuelExpense: FuelExpense) {
    setEditingFuelId(fuelExpense.id);
    setEditDraft({
      vehicleName: fuelExpense.vehicleName,
      driverId: fuelExpense.driverId,
      paidById: fuelExpense.paidById,
      amount: String(Number(fuelExpense.amount)),
      fuelLiters: fuelExpense.fuelLiters ? String(Number(fuelExpense.fuelLiters)) : '',
      distance: fuelExpense.distance ? String(Number(fuelExpense.distance)) : '',
      note: fuelExpense.note ?? '',
      memberIds: fuelExpense.members.map((member) => member.userId),
    });
  }

  function updateDraft<K extends keyof InlineFuelDraft>(key: K, value: InlineFuelDraft[K]) {
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
    setEditingFuelId(null);
    setEditDraft(null);
  }

  function saveInlineEdit() {
    if (!editingFuelId || !editDraft || editDraft.memberIds.length === 0) {
      return;
    }

    updateMutation.mutate({ id: editingFuelId, draft: editDraft });
  }

  function confirmDeleteFuel() {
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
        <h1 className="text-2xl font-bold text-ink">ফুয়েল</h1>
        <p className="text-sm text-slate-600">গাড়ি/বাইক অনুযায়ী ফুয়েল খরচ ও রাইডার শেয়ার।</p>
      </div>

      <TourTabs tourId={tourId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">ফুয়েল খরচের এন্ট্রি</h2>
          <p className="text-sm text-slate-600">গাড়ি, লিটার, পেমেন্টকারী এবং রাইডার ট্র্যাক করুন।</p>
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
            ফুয়েল খরচ যোগ করুন
          </button>
        ) : null}
      </div>

      {session.user.role === 'ADMIN' && showAddForm ? (
        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">ফুয়েল খরচ যোগ করুন</h2>
            <button className="btn-secondary" type="button" onClick={() => setShowAddForm(false)}>
              <X size={16} aria-hidden="true" />
              বাতিল
            </button>
          </div>
          {activeMembers.length === 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              আগে অ্যাক্টিভ ট্যুর মেম্বার যোগ করুন। ফুয়েল খরচে ড্রাইভার, পেমেন্টকারী এবং রাইডার লাগবে।
            </div>
          ) : (
          <form className="mt-4 grid gap-4 lg:grid-cols-4" onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}>
            <label className="block space-y-1">
              <span className="label">গাড়ি / বাইক</span>
              <input className="field" placeholder="বাইক ১ / NMax / Car" {...form.register('vehicleName')} />
            </label>
            <label className="block space-y-1">
              <span className="label">ড্রাইভার / রাইডার</span>
              <select className="field" {...form.register('driverId')}>
                {activeMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="label">ফুয়েল পেমেন্ট করেছে</span>
              <select className="field" {...form.register('paidById')}>
                {activeMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="label">ফুয়েল খরচ</span>
              <input className="field" min="0" placeholder="টাকার পরিমাণ" step="0.01" type="number" {...form.register('amount')} />
            </label>
            <label className="block space-y-1">
              <span className="label">ফুয়েল লিটার</span>
              <input className="field" min="0" placeholder="লিটার" step="0.01" type="number" {...form.register('fuelLiters')} />
            </label>
            <label className="block space-y-1">
              <span className="label">দূরত্ব</span>
              <input className="field" min="0" placeholder="কিমি, ঐচ্ছিক" step="0.01" type="number" {...form.register('distance')} />
            </label>
            <label className="block space-y-1 lg:col-span-2">
              <span className="label">নোট</span>
              <input className="field" placeholder="পাম্প, রুট বা বিস্তারিত" {...form.register('note')} />
            </label>

            <div className="lg:col-span-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="label">অ্যাসাইনড রাইডার</span>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setAddSelectedIds(activeMembers.map((member) => member.userId))}
                >
                  সবাই সিলেক্ট
                </button>
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

            {addMutation.error ? <p className="text-sm text-ember lg:col-span-4">{addMutation.error.message}</p> : null}

            <button className="btn-primary lg:col-span-4" disabled={addMutation.isPending || addSelectedIds.length === 0} type="submit">
              <Fuel size={18} aria-hidden="true" />
              {addMutation.isPending ? 'সেভ হচ্ছে...' : 'ফুয়েল খরচ সেভ করুন'}
            </button>
          </form>
          )}
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead>
              <tr className="table-head">
                <th className="px-4 py-3">গাড়ি / বাইক</th>
                <th className="px-4 py-3">ড্রাইভার / রাইডার</th>
                <th className="px-4 py-3">পেমেন্ট করেছে</th>
                <th className="px-4 py-3">ফুয়েল খরচ</th>
                <th className="px-4 py-3">লিটার</th>
                <th className="px-4 py-3">রাইডার</th>
                <th className="px-4 py-3">তারিখ</th>
                {session.user.role === 'ADMIN' ? <th className="px-4 py-3">অ্যাকশন</th> : null}
              </tr>
            </thead>
            <tbody>
              {fuelExpenses.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-600" colSpan={session.user.role === 'ADMIN' ? 8 : 7}>
                    এখনও কোনো ফুয়েল খরচ যোগ করা হয়নি। গাড়ি/বাইকে ফুয়েল নিলে “ফুয়েল খরচ যোগ করুন” ব্যবহার করুন।
                  </td>
                </tr>
              ) : null}
              {fuelExpenses.map((fuelExpense) => {
                const isEditing = editingFuelId === fuelExpense.id && editDraft;
                const editSharePreview =
                  editDraft?.memberIds.length && isEditing
                    ? Number(editDraft.amount || 0) / editDraft.memberIds.length
                    : 0;

                return (
                  <tr key={fuelExpense.id} className={isEditing ? 'bg-teal-50/40 align-top' : 'hover:bg-slate-50'}>
                    <td className="table-cell font-semibold" data-label="গাড়ি / বাইক">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            className="field min-w-44"
                            value={editDraft.vehicleName}
                            onChange={(event) => updateDraft('vehicleName', event.target.value)}
                          />
                          <input
                            className="field min-w-44"
                            placeholder="নোট"
                            value={editDraft.note}
                            onChange={(event) => updateDraft('note', event.target.value)}
                          />
                          <input
                            className="field min-w-44"
                            min="0"
                            placeholder="দূরত্ব"
                            step="0.01"
                            type="number"
                            value={editDraft.distance}
                            onChange={(event) => updateDraft('distance', event.target.value)}
                          />
                        </div>
                      ) : (
                        <div>
                          <p>{fuelExpense.vehicleName}</p>
                          {fuelExpense.distance ? (
                            <p className="mt-1 text-xs font-normal text-slate-500">{fuelExpense.distance} km</p>
                          ) : null}
                          {fuelExpense.note ? (
                            <p className="mt-1 text-xs font-normal text-slate-500">{fuelExpense.note}</p>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="table-cell" data-label="ড্রাইভার / রাইডার">
                      {isEditing ? (
                        <select
                          className="field min-w-44"
                          value={editDraft.driverId}
                          onChange={(event) => updateDraft('driverId', event.target.value)}
                        >
                          {members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.user.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        fuelExpense.driver.name
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
                        fuelExpense.paidBy.name
                      )}
                    </td>
                    <td className="table-cell" data-label="ফুয়েল খরচ">
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
                        money(fuelExpense.amount)
                      )}
                    </td>
                    <td className="table-cell" data-label="লিটার">
                      {isEditing ? (
                        <input
                          className="field min-w-32"
                          min="0"
                          step="0.01"
                          type="number"
                          value={editDraft.fuelLiters}
                          onChange={(event) => updateDraft('fuelLiters', event.target.value)}
                        />
                      ) : (
                        fuelExpense.fuelLiters ? `${fuelExpense.fuelLiters} L` : '-'
                      )}
                    </td>
                    <td className="table-cell" data-label="রাইডার">
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
                            {editDraft.memberIds.length} জন অ্যাসাইনড, প্রত্যেকে {money(editSharePreview)}
                          </p>
                        </div>
                      ) : (
                        fuelExpense.members.length
                      )}
                    </td>
                    <td className="table-cell" data-label="তারিখ">{dateText(fuelExpense.createdAt)}</td>
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
                            <button className="btn-secondary" type="button" onClick={() => startInlineEdit(fuelExpense)}>
                              <Pencil size={15} aria-hidden="true" />
                              এডিট
                            </button>
                            <button
                              className="btn-danger"
                              disabled={deleteMutation.isPending}
                              type="button"
                              onClick={() => setDeleteTarget(fuelExpense)}
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
        title="ফুয়েল খরচ ডিলিট করবেন?"
        message={
          <>
            <strong>{deleteTarget?.vehicleName}</strong> ফুয়েল খরচটি ডিলিট হলে রাইডার শেয়ার এবং related settlement আবার
            হিসাব হবে।
          </>
        }
        confirmLabel="হ্যাঁ, ফুয়েল খরচ ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteFuel}
      />
    </div>
  );
}
