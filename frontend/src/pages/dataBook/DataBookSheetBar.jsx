import { Plus, Table2 } from "lucide-react";
import { useMemo, useState } from "react";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";

const DataBookSheetBar = ({
  activeSheet,
  canCreate,
  categories,
  hasUncategorised,
  isNewSheetOpen,
  onCreateSheet,
  onNewSheetOpenChange,
  onSelect,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const sortedCategories = useMemo(
    () => [...new Set(categories.filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
    [categories],
  );
  const sheetCount = sortedCategories.length + (hasUncategorised ? 1 : 0);

  const close = () => {
    onNewSheetOpenChange(false);
    setName("");
    setError("");
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Sheet name is required.");
      return;
    }

    const existing = sortedCategories.find(
      (category) => category.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    );
    onCreateSheet(existing ?? trimmed);
    close();
  };

  const chipClass = (active) => [
    "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
    active
      ? "border-brand bg-brand text-white shadow-sm ring-2 ring-brand/10"
      : "border-slate-200 bg-white text-slate-700 hover:border-brand/30 hover:bg-brand-light/30 hover:text-brand",
  ].join(" ");

  return (
    <>
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <span className="inline-flex h-9 shrink-0 items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Table2 className="h-4 w-4" />
          Workbook
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">
            {sheetCount}
          </span>
        </span>
        {sortedCategories.map((category) => (
          <button
            key={category}
            className={chipClass(activeSheet === category)}
            type="button"
            onClick={() => onSelect(category)}
          >
            {category}
          </button>
        ))}
        {hasUncategorised ? (
          <button
            className={chipClass(activeSheet === "")}
            type="button"
            onClick={() => onSelect("")}
          >
            Uncategorised
          </button>
        ) : null}
        {canCreate ? (
          <button
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-brand/30 px-3 text-sm font-semibold text-brand transition-colors hover:border-brand/50 hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            type="button"
            onClick={() => onNewSheetOpenChange(true)}
          >
            <Plus className="h-4 w-4" />
            New sheet
          </button>
        ) : null}
      </div>

      <AppModal isOpen={isNewSheetOpen} maxWidth="max-w-md" onClose={close} title="New sheet">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <AppInput
            autoFocus
            error={error}
            label="Sheet name"
            placeholder="e.g. White Box Data"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
            }}
          />
          <p className="mt-3 text-xs leading-5 text-slate-500">
            The sheet appears permanently after its first row is saved.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <AppButton variant="secondary" onClick={close}>Cancel</AppButton>
            <AppButton type="submit">
              <Plus className="h-4 w-4" />
              Create sheet
            </AppButton>
          </div>
        </form>
      </AppModal>
    </>
  );
};

export default DataBookSheetBar;
