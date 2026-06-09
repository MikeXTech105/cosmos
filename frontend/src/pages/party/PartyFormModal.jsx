import { AnimatePresence, motion } from "framer-motion";
import { Contact, Settings, X } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

import {
  PARTY_COMMAND_FIELDS,
  PARTY_FIELD_SECTIONS,
} from "./partyColumns";
import { buildApiPayload, buildFormValues, getFieldLabel } from "./partyHelpers";

const inputClassName =
  "h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:bg-white focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const isTextareaField = (name) => {
  return /address|message/i.test(name);
};

const FieldInput = ({ disabled, field, onChange, value }) => {
  const label = getFieldLabel(field.name);

  if (field.type === "boolean") {
    return (
      <label
        className={[
          "flex items-center justify-between rounded-2xl border border-slate-100/60 glass-card px-4 py-3 sm:col-span-2",
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
          className="h-4 w-4 accent-[#4F46E5]"
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

  return (
    <div className={isTextareaField(field.name) ? "sm:col-span-2" : ""}>
      <label
        htmlFor={field.name}
        className="mb-1.5 block text-xs font-semibold text-slate-700"
      >
        {label}
      </label>
      {isTextareaField(field.name) ? (
        <textarea
          {...commonProps}
          rows={3}
          className={`${inputClassName} h-auto min-h-24 resize-y py-3`}
        />
      ) : (
        <input
          {...commonProps}
          type={isNumber ? "number" : "text"}
          step={field.type === "integer" ? "1" : "any"}
          className={inputClassName}
        />
      )}
    </div>
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
        <div className="sticky top-0 z-10 -mx-5 mb-5 border-b border-slate-100/70 bg-white/80 px-5 pb-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {groupedFields.map((section, index) => {
              const isActive = section.id === activeSection?.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={[
                    "h-9 shrink-0 rounded-xl px-3 text-xs font-bold transition-all",
                    isActive
                      ? "bg-brand text-white shadow-sm"
                      : "bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-900",
                  ].join(" ")}
                >
                  {index + 1}. {section.title}
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

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 glass px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-white"
        >
          {isView ? "Close" : "Cancel"}
        </button>
        {!isView && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : submitLabel ?? "Save"}
          </button>
        )}
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
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl glass-strong shadow-[0_30px_100px_rgba(79,70,229,0.18)] sm:max-h-[calc(100dvh-3rem)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-slate-100/60 px-5 py-4 sm:px-6 sm:py-5">
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
