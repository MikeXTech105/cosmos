import { AlertTriangle, RotateCcw } from "lucide-react";
import { useState } from "react";

import AppButton from "../../../components/common/AppButton";
import AppModal from "../../../components/common/AppModal";
import { getApiErrorMessage } from "../../../utils/apiError";

const ReversalModal = ({ isOpen, noun = "entry", onClose, onConfirm }) => {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  const trimmedReason = reason.trim();

  const close = () => {
    setError("");
    setReason("");
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!trimmedReason) return;

    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(trimmedReason);
      setReason("");
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, `Unable to reverse ${noun}.`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : close}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <RotateCcw className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Reverse {noun}?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            This reverses the entry and restores balances. This can&apos;t be
            undone.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>A reason is required for the audit trail.</span>
          </div>
        </div>
        <div>
          <label
            htmlFor="rojmel-reversal-reason"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Reversal reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="rojmel-reversal-reason"
            autoFocus
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this entry must be reversed"
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton disabled={isSubmitting} variant="secondary" onClick={close}>
            Keep Entry
          </AppButton>
          <AppButton
            disabled={!trimmedReason}
            isLoading={isSubmitting}
            loadingText="Reversing…"
            type="submit"
            variant="danger"
          >
            <RotateCcw className="h-4 w-4" />
            Reverse Entry
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default ReversalModal;
