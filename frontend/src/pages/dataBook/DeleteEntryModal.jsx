import { AlertTriangle } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import DataBookConflictComparison from "./DataBookConflictComparison";

const DeleteEntryModal = ({
  conflict,
  entry,
  isLoading,
  isOpen,
  onCancel,
  onConfirm,
}) => {
  const busy = isLoading || conflict?.resolving;

  return (
    <AppModal
      isBusy={busy}
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      onClose={busy ? undefined : onCancel}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        Delete &quot;{entry?.name || "entry"}&quot;?
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        This can&apos;t be undone.
      </p>

      {conflict ? (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Someone else changed this entry after the list loaded.
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Review the current saved version before confirming deletion again.
          </p>
          <DataBookConflictComparison
            fields={conflict.fields}
            leftLabel="Selected version"
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton disabled={busy} variant="secondary" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton
          isLoading={busy}
          loadingText="Deleting…"
          variant="danger"
          onClick={onConfirm}
        >
          {conflict ? "Delete current version" : "Delete"}
        </AppButton>
      </div>
    </AppModal>
  );
};

export default DeleteEntryModal;
