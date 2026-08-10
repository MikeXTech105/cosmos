import { Eye, EyeOff, NotebookPen } from "lucide-react";
import { useMemo, useState } from "react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiFieldErrors,
} from "../../utils/apiError";
import DataBookConflictComparison from "./DataBookConflictComparison";

const EMPTY_FORM = {
  category: "",
  description: "",
  isPrivate: false,
  name: "",
  rowVersion: null,
  value: "",
};

const getForm = (entry) => ({
  category: entry?.category ?? "",
  description: entry?.description ?? "",
  isPrivate: Boolean(entry?.isPrivate),
  name: entry?.name ?? "",
  rowVersion: entry?.rowVersion ?? null,
  value: entry?.value ?? "",
});

const withReference = (message, correlationId) =>
  correlationId && !String(message).includes(correlationId)
    ? `${message} Ref: ${correlationId}`
    : message;

const EntryFormModal = ({
  categories,
  conflict,
  entry,
  isLoading,
  isOpen,
  mode,
  onClose,
  onDiscardConflict,
  onKeepConflict,
  onSubmit,
}) => {
  const [form, setForm] = useState(() =>
    mode === "create" ? EMPTY_FORM : getForm(entry),
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [showValue, setShowValue] = useState(() => !entry?.isPrivate);
  const isEdit = mode === "edit";

  const categoryOptions = useMemo(() => {
    const values = new Set(categories.filter(Boolean));
    if (form.category) values.add(form.category);
    return [...values]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ label: value, value }));
  }, [categories, form.category]);

  const updateForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      delete next.root;
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.value.trim()) next.value = "Value is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        category: form.category.trim(),
        description: form.description.trim(),
        isPrivate: form.isPrivate,
        name: form.name.trim(),
        ...(isEdit ? { rowVersion: form.rowVersion } : {}),
        value: form.value,
      });
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = withReference(
        getApiErrorMessage(error, "Unable to save entry."),
        error?.correlationId || getApiCorrelationId(error),
      );
      setErrors({ ...fieldErrors, root: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const privacyChanged = isEdit && Boolean(entry) && entry.isPrivate !== form.isPrivate;
  const busy = isSubmitting || conflict?.resolving;

  return (
    <AppModal
      isBusy={busy}
      isOpen={isOpen}
      maxWidth="max-w-3xl"
      onClose={busy ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <NotebookPen className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit entry" : "New entry"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Store a reference value for quick, controlled access.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={submit}>
          {errors.root ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root}
            </p>
          ) : null}

          <AppInput
            autoFocus
            error={errors.name}
            label="Name"
            required
            value={form.name}
            onChange={(event) => updateForm({ name: event.target.value })}
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="data-book-value" className="text-[13px] font-medium text-slate-700">
                Value<span className="ml-0.5 text-red-500">*</span>
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-light"
                onClick={() => setShowValue((current) => !current)}
              >
                {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showValue ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <textarea
                id="data-book-value"
                aria-invalid={Boolean(errors.value) || undefined}
                className={[
                  "min-h-32 w-full resize-y rounded-lg border bg-white px-4 py-3 pr-24 font-mono text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20",
                  errors.value ? "border-red-400 bg-red-50" : "border-slate-200",
                  showValue ? "text-slate-800" : "text-transparent caret-transparent selection:bg-slate-200",
                ].join(" ")}
                required
                value={form.value}
                onChange={(event) => updateForm({ value: event.target.value })}
              />
              {!showValue && form.value ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-3 max-h-24 overflow-hidden whitespace-pre-wrap break-all font-mono text-sm leading-5 tracking-[0.16em] text-slate-500"
                >
                  {form.value.replace(/[^\n]/g, "•")}
                </div>
              ) : null}
            </div>
            {errors.value ? (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{errors.value}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="data-book-description" className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="data-book-description"
              className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
            />
            {errors.description ? (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{errors.description}</p>
            ) : null}
          </div>

          {newCategoryMode ? (
            <div>
              <AppInput
                autoFocus
                error={errors.category}
                label="New category"
                placeholder="Enter a category"
                value={form.category}
                onChange={(event) => updateForm({ category: event.target.value })}
              />
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-brand hover:underline"
                onClick={() => {
                  setNewCategoryMode(false);
                  updateForm({ category: "" });
                }}
              >
                Choose an existing category
              </button>
            </div>
          ) : (
            <AppSelect
              creatable
              createLabel="New category…"
              error={errors.category}
              label="Category"
              options={[{ label: "No category", value: "" }, ...categoryOptions]}
              placeholder="No category"
              value={form.category}
              onChange={(value) => updateForm({ category: value })}
              onCreateClick={() => {
                setNewCategoryMode(true);
                updateForm({ category: "" });
              }}
            />
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <input
              checked={form.isPrivate}
              className="mt-1 h-4 w-4 rounded border-slate-300 accent-brand focus:ring-brand"
              type="checkbox"
              onChange={(event) => {
                const isPrivate = event.target.checked;
                updateForm({ isPrivate });
                if (isPrivate) setShowValue(false);
              }}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Keep this information private
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Private information is visible only to you. Public information is visible to all users who have Data Book access and may be edited by users with Edit permission.
              </span>
            </span>
          </label>

          {privacyChanged ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {form.isPrivate
                ? "This will become your private entry and will disappear from everyone else's list."
                : "This will become visible to everyone with Data Book access."}
            </div>
          ) : null}

          {conflict ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Someone else changed this entry while you were editing.
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                {conflict.reloading
                  ? "Reloading the current saved version. Nothing you typed has been discarded."
                  : "Review every difference. Nothing you typed has been discarded."}
              </p>
              {conflict.reloading ? (
                <div className="mt-3 h-16 animate-pulse rounded-lg bg-amber-100" />
              ) : (
                <>
                  <DataBookConflictComparison fields={conflict.fields} />
                  {conflict.error ? (
                    <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      {conflict.error}
                    </p>
                  ) : null}
                  {conflict.current ? (
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <AppButton
                        disabled={conflict.resolving}
                        variant="secondary"
                        onClick={onDiscardConflict}
                      >
                        Discard mine
                      </AppButton>
                      <AppButton
                        isLoading={conflict.resolving}
                        loadingText="Saving…"
                        onClick={onKeepConflict}
                      >
                        Keep my changes
                      </AppButton>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <AppButton disabled={busy} variant="secondary" onClick={onClose}>
              Cancel
            </AppButton>
            {!conflict ? (
              <AppButton
                isLoading={isSubmitting}
                loadingText="Saving…"
                type="submit"
              >
                {isEdit ? "Save changes" : "Create entry"}
              </AppButton>
            ) : null}
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default EntryFormModal;
