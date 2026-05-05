'use client';

import { AlertTriangle, X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  warningText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'ডিলিট করুন',
  cancelLabel = 'ক্যানসেল',
  loadingLabel = 'ডিলিট হচ্ছে...',
  warningText = 'এই কাজটি নিশ্চিত করার আগে ভালোভাবে দেখে নিন। কনফার্ম না করলে কোনো ডাটা ডিলিট হবে না।',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-red-100 bg-white p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-ember ring-1 ring-red-100">
              <AlertTriangle size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-ink">{title}</h2>
              <div className="mt-2 text-sm leading-6 text-slate-600">{message}</div>
            </div>
          </div>
          <button
            aria-label="মডাল বন্ধ করুন"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-500 transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            type="button"
            onClick={onCancel}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {warningText}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn-secondary" disabled={loading} type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-danger" disabled={loading} type="button" onClick={onConfirm}>
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
