import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Contact, Settings, X } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import AppInput from "../../components/common/AppInput";
import {
  PARTY_COMMAND_FIELDS,
  PARTY_FIELD_SECTIONS,
} from "./partyColumns";
import { buildApiPayload, buildFormValues, getFieldLabel } from "./partyHelpers";

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const isTextareaField = (name) => {
  return /address|message/i.test(name);
};

const normalizeNumberInput = (rawValue, { integer = false } = {}) => {
  const value = String(rawValue ?? "").replace(integer ? /\D/g : /[^\d.]/g, "");

  if (!value) {
    return "";
  }

  if (integer) {
    return value.replace(/^0+(?=\d)/, "") || "0";
  }

  const decimalIndex = value.indexOf(".");

  if (decimalIndex >= 0) {
    const integerPart =
      value.slice(0, decimalIndex).replace(/^0+(?=\d)/, "") || "0";
    const decimalPart = value.slice(decimalIndex + 1).replace(/\./g, "");

    return `${integerPart}.${decimalPart}`;
  }

  return value.replace(/^0+(?=\d)/, "") || "0";
};

const normalizeNumberBlurValue = (value, options) => {
  const normalized = normalizeNumberInput(value, options);

  if (!normalized) {
    return "0";
  }

  const completedValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  const numberValue = Number(completedValue);

  return Number.isFinite(numberValue) ? String(numberValue) : "0";
};

const FieldInput = ({ disabled, field, onChange, value }) => {
  const label = getFieldLabel(field.name);

  if (field.type === "boolean") {
    return (
      <label
        className={[
          "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2",
          disabled ? "cursor-default" : "cursor-pointer",
        ].join(" ")}
      >
        <span className="block text-sm font-semibold text-slate-900">
          {label}
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(field.name, event.target.checked)}
          className="h-4 w-4 accent-brand"
        />
      </label>
    );
  }

  const isNumber = field.type === "integer" || field.type === "number";
  const commonProps = {
    id: field.name,
    disabled,
    value: value ?? "",
    onChange: (event) => onChange(field.name, event.target.value),
  };

  if (isTextareaField(field.name)) {
    return (
      <div className="sm:col-span-2">
        <label
          htmlFor={field.name}
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          {label}
        </label>
        <textarea
          {...commonProps}
          rows={3}
          className={`${inputClassName} h-auto min-h-24 resize-y py-3`}
        />
      </div>
    );
  }

  return (
    <AppInput
      {...commonProps}
      label={label}
      type="text"
      inputMode={
        isNumber ? (field.type === "integer" ? "numeric" : "decimal") : undefined
      }
      className="h-10"
      onFocus={(event) => {
        if (isNumber && String(value) === "0") {
          event.target.select();
        }
      }}
      onKeyDown={(event) => {
        if (isNumber && ["e", "E", "+", "-"].includes(event.key)) {
          event.preventDefault();
        }
      }}
      onChange={
        isNumber
          ? (event) =>
              onChange(
                field.name,
                normalizeNumberInput(event.target.value, {
                  integer: field.type === "integer",
                }),
              )
          : commonProps.onChange
      }
      onBlur={
        isNumber
          ? (event) =>
              onChange(
                field.name,
                normalizeNumberBlurValue(event.target.value, {
                  integer: field.type === "integer",
                }),
              )
          : undefined
      }
    />
  );
};

const ModalSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
};

const PartyFormContent = ({
  fields,
  groupedFields,
  isView,
  onClose,
  onSubmit,
  source,
  submitLabel,
}) => {
  const firstSectionId = groupedFields[0]?.id;
  const [activeSectionId, setActiveSectionId] = useState(firstSectionId);
  const [values, setValues] = useState(() => buildFormValues(fields, source));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeSection =
    groupedFields.find((section) => section.id === activeSectionId) ??
    groupedFields[0];
  const activeSectionIndex = Math.max(
    0,
    groupedFields.findIndex((section) => section.id === activeSection?.id),
  );
  const isLastSection = activeSectionIndex === groupedFields.length - 1;

  const handleFieldChange = (fieldName, value) => {
    setValues((current) => ({
      ...current,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isView) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(buildApiPayload(fields, values));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="sticky top-0 z-10 -mx-5 mb-5 border-b border-slate-200 bg-white px-5 pb-0 sm:-mx-6 sm:px-6">
          <div className="flex overflow-x-auto">
            {groupedFields.map((section, index) => {
              const isActive = section.id === activeSection?.id;
              const isComplete = index < activeSectionIndex;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={[
                    "relative flex h-12 shrink-0 items-center gap-2 px-3 text-xs font-semibold transition-colors",
                    isActive
                      ? "text-brand"
                      : "text-slate-500 hover:text-slate-900",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                      isActive
                        ? "bg-brand text-white"
                        : isComplete
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span>{section.title}</span>
                  {isActive && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 bg-brand" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeSection && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              {activeSection.title}
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {activeSection.fields.map((field) => (
                <FieldInput
                  key={field.name}
                  disabled={isView}
                  field={field}
                  onChange={handleFieldChange}
                  value={values[field.name]}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs font-medium text-slate-400">
          Step {activeSectionIndex + 1} of {groupedFields.length}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            {isView ? "Close" : "Cancel"}
          </button>
          {!isView && (
            <button
              type={isLastSection ? "submit" : "button"}
              onClick={
                isLastSection
                  ? undefined
                  : () =>
                      setActiveSectionId(
                        groupedFields[activeSectionIndex + 1]?.id,
                      )
              }
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Saving..."
                : isLastSection
                  ? submitLabel ?? "Save"
                  : "Next"}
              {isLastSection ? (
                <Check className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

const PartyFormModal = ({
  description,
  fields = PARTY_COMMAND_FIELDS,
  icon = "party",
  isLoading,
  isOpen,
  mode = "create",
  onClose,
  onSubmit,
  sections = PARTY_FIELD_SECTIONS,
  source,
  submitLabel,
  title,
}) => {
  const isView = mode === "view";
  const groupedFields = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        fields: fields.filter((field) => field.section === section.id),
      }))
      .filter((section) => section.fields.length > 0);
  }, [fields, sections]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const Icon = icon === "settings" ? Settings : Contact;
  const formKey = `${mode}:${source?.id ?? "new"}:${fields
    .map((field) => field.name)
    .join("|")}`;

  const modalTitle =
    title ?? (mode === "edit" ? "Edit Party" : mode === "view" ? "View Party" : "Add Party");
  const modalDescription =
    description ??
    (mode === "edit"
      ? "Update Party details."
      : mode === "view"
        ? "Review Party details."
        : "Create a Party record.");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="party-modal-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="party-modal-title"
                    className="text-lg font-bold tracking-tight text-slate-950"
                  >
                    {modalTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {modalDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close party modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <ModalSkeleton count={fields.length} />
            ) : (
              <PartyFormContent
                key={formKey}
                fields={fields}
                groupedFields={groupedFields}
                isView={isView}
                source={source}
                submitLabel={submitLabel}
                onClose={onClose}
                onSubmit={onSubmit}
              />
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default memo(PartyFormModal);
