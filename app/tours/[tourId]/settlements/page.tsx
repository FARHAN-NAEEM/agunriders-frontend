'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/status-badge';
import { TourTabs } from '@/components/tour-tabs';
import { apiFetch, dateText, money } from '@/lib/api';
import { useSessionGuard } from '@/lib/hooks';
import { bnLabel, paymentMethodLabel } from '@/lib/i18n';
import type { PaymentMethod, Settlement, TourMember } from '@/lib/types';

const methods: PaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'];

type InlineSettlementDraft = {
  paidById: string;
  receivedById: string;
  amount: string;
  paymentMethod: PaymentMethod;
  note: string;
};

export default function SettlementsPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;
  const queryClient = useQueryClient();
  const { session, ready } = useSessionGuard();
  const [editingSettlementId, setEditingSettlementId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<InlineSettlementDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Settlement | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Settlement | null>(null);
  const { data: members = [] } = useQuery({
    queryKey: ['members', tourId],
    queryFn: () => apiFetch<TourMember[]>(`/tours/${tourId}/members`),
    enabled: ready && Boolean(session && tourId),
  });
  const { data: settlements = [] } = useQuery({
    queryKey: ['settlements', tourId],
    queryFn: () => apiFetch<Settlement[]>(`/tours/${tourId}/settlements`),
    enabled: ready && Boolean(session && tourId),
  });
  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);
  const pendingCount = settlements.filter((settlement) => settlement.status === 'PENDING').length;
  const confirmedCount = settlements.filter((settlement) => settlement.status === 'CONFIRMED').length;
  const loanCount = settlements.filter((settlement) => settlement.source === 'LOAN').length;
  const expenseCount = settlements.filter((settlement) => settlement.source === 'EXPENSE').length;
  const fuelCount = settlements.filter((settlement) => settlement.source === 'FUEL').length;
  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: InlineSettlementDraft }) =>
      apiFetch<Settlement>(`/settlements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          paidById: draft.paidById,
          receivedById: draft.receivedById,
          amount: Number(draft.amount),
          paymentMethod: draft.paymentMethod,
          note: draft.note,
        }),
      }),
    onSuccess: () => {
      setEditingSettlementId(null);
      setEditDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['settlements', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Settlement>(`/settlements/${id}/confirm`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settlements', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/settlements/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settlements', tourId] });
      void queryClient.invalidateQueries({ queryKey: ['report', tourId] });
    },
  });

  if (!ready || !session) {
    return null;
  }

  function startInlineEdit(settlement: Settlement) {
    setEditingSettlementId(settlement.id);
    setEditDraft({
      paidById: settlement.paidById,
      receivedById: settlement.receivedById,
      amount: String(Number(settlement.amount)),
      paymentMethod: settlement.paymentMethod,
      note: settlement.note ?? '',
    });
  }

  function patchEditDraft(patch: Partial<InlineSettlementDraft>) {
    setEditDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function cancelInlineEdit() {
    setEditingSettlementId(null);
    setEditDraft(null);
  }

  function saveInlineEdit() {
    if (!editingSettlementId || !editDraft || !editDraft.amount || editDraft.paidById === editDraft.receivedById) {
      return;
    }

    updateMutation.mutate({ id: editingSettlementId, draft: editDraft });
  }

  function confirmDeleteSettlement() {
    if (!deleteTarget) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function confirmSettlementPayment() {
    if (!confirmTarget) {
      return;
    }

    confirmMutation.mutate(confirmTarget.id, {
      onSuccess: () => setConfirmTarget(null),
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">সেটেলমেন্ট</h1>
        <p className="text-sm text-slate-600">লোন, খরচ এবং ফুয়েল থেকে পাওনা-পেমেন্ট এখানে অটো আসবে।</p>
      </div>

      <TourTabs tourId={tourId} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="surface p-4">
          <p className="text-sm font-semibold text-slate-600">কনফার্মের অপেক্ষায়</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm font-semibold text-slate-600">কনফার্মড সেটেলমেন্ট</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{confirmedCount}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm font-semibold text-slate-600">লোন</p>
          <p className="mt-2 text-2xl font-bold text-violet-700">{loanCount}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm font-semibold text-slate-600">খরচ</p>
          <p className="mt-2 text-2xl font-bold text-orange-700">{expenseCount}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm font-semibold text-slate-600">ফুয়েল</p>
          <p className="mt-2 text-2xl font-bold text-cyan-700">{fuelCount}</p>
        </div>
      </div>

      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-bold">সেটেলমেন্ট কিউ</h2>
            <p className="text-sm text-slate-600">যখন সত্যিই টাকা পরিশোধ হবে, তখনই কনফার্ম করুন।</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {settlements.length} টি আইটেম
          </span>
        </div>
        <div className="hidden xl:block">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="table-head">
                <th className="w-[11%] px-4 py-3">দেবে</th>
                <th className="w-[11%] px-4 py-3">পাবে</th>
                <th className="w-[9%] px-4 py-3">পরিমাণ</th>
                <th className="w-[8%] px-4 py-3">মেথড</th>
                <th className="w-[8%] px-4 py-3">ক্যাটাগরি</th>
                <th className="w-[8%] px-4 py-3">স্ট্যাটাস</th>
                <th className="w-[24%] px-4 py-3">নোট</th>
                <th className="w-[8%] px-4 py-3">তৈরি</th>
                {session.user.role === 'ADMIN' ? <th className="w-[13%] px-4 py-3">অ্যাকশন</th> : null}
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-600" colSpan={session.user.role === 'ADMIN' ? 9 : 8}>
                    এখন কোনো সেটেলমেন্ট অপেক্ষায় নেই। লোন, খরচ এবং ফুয়েল এন্ট্রি দিলে এখানে অটো আইটেম তৈরি হবে।
                  </td>
                </tr>
              ) : null}
              {settlements.map((settlement) => {
                const isEditing = editingSettlementId === settlement.id && editDraft;

                return (
                  <tr key={settlement.id} className={isEditing ? 'bg-teal-50/40 align-top' : 'hover:bg-slate-50'}>
                    <td className="table-cell">
                      {isEditing ? (
                        <label className="block min-w-44 space-y-1">
                          <span className="label">দেবে</span>
                          <select
                            className="field"
                            value={editDraft.paidById}
                            onChange={(event) => patchEditDraft({ paidById: event.target.value })}
                          >
                            {activeMembers.map((member) => (
                              <option key={member.userId} value={member.userId}>
                                {member.user.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div>
                          <p className="font-semibold">{settlement.paidBy.name}</p>
                          <p className="mt-1 text-xs text-slate-500">টাকা দেবে</p>
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      {isEditing ? (
                        <label className="block min-w-44 space-y-1">
                          <span className="label">পাবে</span>
                          <select
                            className="field"
                            value={editDraft.receivedById}
                            onChange={(event) => patchEditDraft({ receivedById: event.target.value })}
                          >
                            {activeMembers.map((member) => (
                              <option key={member.userId} value={member.userId}>
                                {member.user.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div>
                          <p className="font-semibold">{settlement.receivedBy.name}</p>
                          <p className="mt-1 text-xs text-slate-500">টাকা পাবে</p>
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
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
                        <span className="font-bold text-ink">{money(settlement.amount)}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {isEditing ? (
                        <label className="block min-w-36 space-y-1">
                          <span className="label">মেথড</span>
                          <select
                            className="field"
                            value={editDraft.paymentMethod}
                            onChange={(event) => patchEditDraft({ paymentMethod: event.target.value as PaymentMethod })}
                          >
                            {methods.map((method) => (
                              <option key={method} value={method}>
                                {bnLabel(method, paymentMethodLabel)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        bnLabel(settlement.paymentMethod, paymentMethodLabel)
                      )}
                    </td>
                    <td className="table-cell">
                      <StatusBadge value={settlement.source} />
                    </td>
                    <td className="table-cell">
                      <StatusBadge value={settlement.status} />
                    </td>
                    <td className="table-cell">
                      {isEditing ? (
                        <label className="block min-w-52 space-y-1">
                          <span className="label">নোট</span>
                          <input
                            className="field"
                            placeholder="ঐচ্ছিক নোট"
                            value={editDraft.note}
                            onChange={(event) => patchEditDraft({ note: event.target.value })}
                          />
                        </label>
                      ) : (
                        settlement.note ?? '-'
                      )}
                    </td>
                    <td className="table-cell">{dateText(settlement.createdAt)}</td>
                    {session.user.role === 'ADMIN' ? (
                      <td className="table-cell whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-river px-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-cyan-800"
                              disabled={
                                updateMutation.isPending ||
                                !editDraft.amount ||
                                editDraft.paidById === editDraft.receivedById
                              }
                              type="button"
                              onClick={saveInlineEdit}
                            >
                              <Check size={15} aria-hidden="true" />
                              সেভ
                            </button>
                            <button
                              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-bold text-ink shadow-sm transition hover:bg-slate-50"
                              type="button"
                              onClick={cancelInlineEdit}
                            >
                              <X size={15} aria-hidden="true" />
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {settlement.status === 'PENDING' ? (
                              <button
                                className="inline-flex h-7 items-center justify-center rounded-md bg-river px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={confirmMutation.isPending}
                                type="button"
                                onClick={() => setConfirmTarget(settlement)}
                              >
                                কনফার্ম
                              </button>
                            ) : null}
                            <button
                              className="inline-grid h-7 w-7 place-items-center rounded-md border border-line bg-white text-ink shadow-sm transition hover:bg-slate-50"
                              type="button"
                              title="এডিট"
                              onClick={() => startInlineEdit(settlement)}
                            >
                              <Pencil size={14} aria-hidden="true" />
                            </button>
                            <button
                              className="inline-grid h-7 w-7 place-items-center rounded-md bg-ember text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={deleteMutation.isPending}
                              type="button"
                              title="ডিলিট"
                              onClick={() => setDeleteTarget(settlement)}
                            >
                              <Trash2 size={14} aria-hidden="true" />
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

        <div className="grid gap-3 p-4 xl:hidden">
          {settlements.length === 0 ? (
            <div className="rounded-lg border border-line bg-slate-50 p-4 text-sm text-slate-600">
              এখন কোনো সেটেলমেন্ট অপেক্ষায় নেই। লোন, খরচ এবং ফুয়েল এন্ট্রি দিলে এখানে অটো আইটেম তৈরি হবে।
            </div>
          ) : null}

          {settlements.map((settlement) => {
            const isEditing = editingSettlementId === settlement.id && editDraft;

            return (
              <article key={settlement.id} className="rounded-xl border border-line bg-white p-4 shadow-sm">
                {isEditing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="label">দেবে</span>
                      <select
                        className="field"
                        value={editDraft.paidById}
                        onChange={(event) => patchEditDraft({ paidById: event.target.value })}
                      >
                        {activeMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.user.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="label">পাবে</span>
                      <select
                        className="field"
                        value={editDraft.receivedById}
                        onChange={(event) => patchEditDraft({ receivedById: event.target.value })}
                      >
                        {activeMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.user.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1">
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
                    <label className="block space-y-1">
                      <span className="label">মেথড</span>
                      <select
                        className="field"
                        value={editDraft.paymentMethod}
                        onChange={(event) => patchEditDraft({ paymentMethod: event.target.value as PaymentMethod })}
                      >
                        {methods.map((method) => (
                          <option key={method} value={method}>
                            {bnLabel(method, paymentMethodLabel)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 sm:col-span-2">
                      <span className="label">নোট</span>
                      <input
                        className="field"
                        placeholder="ঐচ্ছিক নোট"
                        value={editDraft.note}
                        onChange={(event) => patchEditDraft({ note: event.target.value })}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                      <button
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-river px-3 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-800"
                        disabled={
                          updateMutation.isPending ||
                          !editDraft.amount ||
                          editDraft.paidById === editDraft.receivedById
                        }
                        type="button"
                        onClick={saveInlineEdit}
                      >
                        <Check size={15} aria-hidden="true" />
                        সেভ
                      </button>
                      <button
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink shadow-sm transition hover:bg-slate-50"
                        type="button"
                        onClick={cancelInlineEdit}
                      >
                        <X size={15} aria-hidden="true" />
                        বাতিল
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">দেবে</p>
                        <p className="mt-1 font-bold text-ink">{settlement.paidBy.name}</p>
                      </div>
                      <div className="hidden h-px bg-line sm:block sm:h-auto sm:w-px sm:self-stretch" />
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">পাবে</p>
                        <p className="mt-1 font-bold text-ink">{settlement.receivedBy.name}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">পরিমাণ</p>
                        <p className="mt-1 text-lg font-black text-ink">{money(settlement.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">মেথড</p>
                        <p className="mt-1 font-semibold">{bnLabel(settlement.paymentMethod, paymentMethodLabel)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={settlement.source} />
                        <StatusBadge value={settlement.status} />
                      </div>
                      <div className="text-sm text-slate-600">{dateText(settlement.createdAt)}</div>
                    </div>

                    {settlement.note ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{settlement.note}</p> : null}

                    {session.user.role === 'ADMIN' ? (
                      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
                        {settlement.status === 'PENDING' ? (
                          <button
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-river px-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={confirmMutation.isPending}
                            type="button"
                            onClick={() => setConfirmTarget(settlement)}
                          >
                            কনফার্ম
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          className="inline-grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink shadow-sm transition hover:bg-slate-50"
                          type="button"
                          title="এডিট"
                          onClick={() => startInlineEdit(settlement)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          className="inline-grid h-8 w-8 place-items-center rounded-lg bg-ember text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          type="button"
                          title="ডিলিট"
                          onClick={() => setDeleteTarget(settlement)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="সেটেলমেন্ট ডিলিট করবেন?"
        message={
          <>
            <strong>{deleteTarget?.paidBy.name}</strong> থেকে <strong>{deleteTarget?.receivedBy.name}</strong> এর
            {deleteTarget ? ` ${money(deleteTarget.amount)} ` : ' '}
            সেটেলমেন্ট item ডিলিট হবে।
          </>
        }
        confirmLabel="হ্যাঁ, সেটেলমেন্ট ডিলিট করুন"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteSettlement}
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="সেটেলমেন্ট কনফার্ম করবেন?"
        message={
          <>
            <strong>{confirmTarget?.paidBy.name}</strong> থেকে <strong>{confirmTarget?.receivedBy.name}</strong> এর
            {confirmTarget ? ` ${money(confirmTarget.amount)} ` : ' '}
            পেমেন্ট সত্যিই সম্পন্ন হলে কনফার্ম করুন।
          </>
        }
        confirmLabel="হ্যাঁ, কনফার্ম করুন"
        loading={confirmMutation.isPending}
        loadingLabel="কনফার্ম হচ্ছে..."
        warningText="কনফার্ম করলে এই সেটেলমেন্ট রিপোর্টের হিসাবের মধ্যে গণনা হবে। টাকা সত্যিই পরিশোধ না হলে কনফার্ম করবেন না।"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmSettlementPayment}
      />
    </div>
  );
}
