import { AnimatePresence, motion } from "framer-motion";
import { Contact, X } from "lucide-react";
import { memo, useEffect, useMemo } from "react";

import {
  PARTY_COMMAND_FIELDS,
  PARTY_DTO_FIELDS,
  PARTY_FIELD_SECTIONS,
} from "./partyColumns";
import { formatDate, formatValue, getFieldLabel } from "./partyHelpers";

const AUDIT_FIELDS = [
  "id",
  "createdOn",
  "createdBy",
  "modifiedOn",
  "modifiedBy",
  "isDeleted",
  "deletedOn",
  "rowVersion",
];

const DetailItem = ({ name, value }) => {
  const isDateField = /On$/i.test(name);
  const displayValue = isDateField ? formatDate(value) : formatValue(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {getFieldLabel(name)}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {displayValue}
      </p>
    </div>
  );
};

const ModalSkeleton = () => {
  return (
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
};

const PartyDetailsModal = ({ isLoading, isOpen, onClose, party }) => {
  const sections = useMemo(() => {
    const commandFieldMap = new Map(
      PARTY_COMMAND_FIELDS.map((field) => [field.name, field]),
    );

    const commandSections = PARTY_FIELD_SECTIONS.map((section) => ({
      ...section,
      fields: PARTY_DTO_FIELDS.filter((fieldName) => {
        return commandFieldMap.get(fieldName)?.section === section.id;
      }),
    })).filter((section) => section.fields.length > 0);

    return [
      ...commandSections,
      {
        id: "audit",
        title: "Audit",
        fields: AUDIT_FIELDS,
      },
    ];
  }, []);

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
            aria-labelledby="party-details-title"
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
                  <Contact className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="party-details-title"
                    className="text-lg font-bold tracking-tight text-slate-950"
                  >
                    Party Details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {party?.partyName || party?.tradeName || party?.partyCode || ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close party details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <ModalSkeleton />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-6">
                  {sections.map((section) => (
                    <section key={section.id}>
                      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        {section.title}
                      </h3>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        {section.fields.map((fieldName) => (
                          <DetailItem
                            key={fieldName}
                            name={fieldName}
                            value={party?.[fieldName]}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}

            <div className="flex shrink-0 justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default memo(PartyDetailsModal);
