import {
  AlertCircle,
  ClipboardCopy,
  ClipboardPaste,
  History,
  LoaderCircle,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import useScopedDraft from "../../hooks/useScopedDraft";
import AppTooltip from "../../components/common/AppTooltip";
import {
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../components/common/DataTableShell";
import DeleteEntryModal from "./DeleteEntryModal";
import DataBookPasteModal from "./DataBookPasteModal";
import {
  getDataBookColumns,
  saveDataBookColumns,
} from "./dataBookColumns";
import { parseDataBookPaste } from "./dataBookPaste";
import useDataBookGrid, {
  DATA_BOOK_GRID_FIELDS,
  isDataBookGridRowBlank,
} from "./useDataBookGrid";

const rowBorder = {
  clean: "border-l-transparent",
  dirty: "border-l-amber-400",
  error: "border-l-red-400",
  saved: "border-l-emerald-400",
  saving: "border-l-brand",
};

const HeaderCell = ({ field, label, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  const save = () => {
    onSave(field, draft);
    setEditing(false);
  };

  return (
    <th className="group px-3 py-3.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
      {editing ? (
        <input
          autoFocus
          aria-label={`Rename ${label} column`}
          className="h-7 w-full rounded border border-brand bg-white px-2 text-xs font-medium normal-case tracking-normal text-slate-800 outline-none ring-2 ring-brand/20"
          value={draft}
          onBlur={save}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setDraft(label);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className="inline-flex items-center gap-1.5 text-left focus-visible:outline-none focus-visible:text-brand"
          type="button"
          onClick={() => setEditing(true)}
        >
          <span>{label}</span>
          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
    </th>
  );
};

const ActionButton = ({ danger, disabled, icon: Icon, label, loading, onClick }) => (
  <AppTooltip label={label}>
    <button
      aria-label={label}
      className={danger ? DATA_TABLE_ROW_ACTION_DANGER_CLASS : DATA_TABLE_ROW_ACTION_CLASS}
      disabled={disabled || loading}
      type="button"
      onClick={onClick}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </button>
  </AppTooltip>
);

const GridSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        <tbody>
          {Array.from({ length: 7 }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100">
              {Array.from({ length: 6 }, (__, columnIndex) => (
                <td key={columnIndex} className="px-3 py-3">
                  <div className="h-4 animate-pulse rounded bg-slate-100" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const conflictLine = (row) => [row.name, row.value, row.description]
  .filter((value) => String(value ?? "") !== "")
  .join("  |  ");

const DataBookGrid = ({
  activeSheet,
  draftContext,
  capabilities,
  copyingId,
  entries,
  error,
  loading,
  onCommitted,
  onCopy,
  onHistory,
  onNewSheet,
  onPendingChange,
  onRetry,
}) => {
  const [columns, setColumns] = useState(() => getDataBookColumns(activeSheet));
  const [paste, setPaste] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [lastFocusedCell, setLastFocusedCell] = useState({ column: 0, row: 0 });
  const cellRefs = useRef(new Map());
  const rowRefs = useRef(new Map());
  const grid = useDataBookGrid({ activeSheet, entries, onCommitted });
  const pendingRows = grid.rows.filter((row) => ((["dirty", "error"].includes(row.status) && !row.loadError) || row.conflict || row.status === "saving") && !row.removed);
  const pendingCount = pendingRows.length;
  const draft = useScopedDraft({ entity: "data-book-grid", context: draftContext ?? activeSheet ?? "none", values: pendingRows, enabled: pendingCount > 0 });
  const hadDirtyRows = useRef(false);
  useEffect(() => { onPendingChange?.(pendingCount + (grid.isSaving ? 1 : 0), draft.saveDraft); }, [draft.saveDraft, pendingCount, grid.isSaving, onPendingChange]);
  useEffect(() => {
    if (pendingCount > 0) hadDirtyRows.current = true;
    else if (hadDirtyRows.current && !grid.isSaving) { draft.clearDraft(); hadDirtyRows.current = false; }
  }, [draft, pendingCount, grid.isSaving]);

  const visibleRows = useMemo(() => grid.rows, [grid.rows]);
  const hasSavedRows = visibleRows.some((row) => row.id !== undefined && !row.removed);

  const saveHeader = (field, value) => {
    const next = saveDataBookColumns(activeSheet, {
      ...columns,
      [field]: value,
    });
    setColumns(next);
  };

  const getCellRef = useCallback((rowKey, columnIndex) =>
    cellRefs.current.get(`${rowKey}:${columnIndex}`), []);

  const focusCell = useCallback((rowIndex, columnIndex, direction = 1) => {
    let nextRow = rowIndex;
    let nextColumn = columnIndex;
    const maxAttempts = Math.max(1, visibleRows.length * DATA_BOOK_GRID_FIELDS.length);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (nextColumn >= DATA_BOOK_GRID_FIELDS.length) {
        nextColumn = 0;
        nextRow += 1;
      } else if (nextColumn < 0) {
        nextColumn = DATA_BOOK_GRID_FIELDS.length - 1;
        nextRow -= 1;
      }

      if (nextRow < 0 || nextRow >= visibleRows.length) return;
      const target = getCellRef(visibleRows[nextRow].key, nextColumn);
      if (target && !target.disabled) {
        window.requestAnimationFrame(() => target.focus());
        return;
      }
      nextColumn += direction;
    }
  }, [getCellRef, visibleRows]);

  const handleCellKeyDown = (event, row, rowIndex, columnIndex, field) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "s") {
      event.preventDefault();
      void handleSaveAll();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      grid.revertCell(row.key, field);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      focusCell(rowIndex, columnIndex + direction, direction);
      return;
    }

    if (event.key === "Enter") {
      if (field === "value" && event.shiftKey) return;
      event.preventDefault();
      focusCell(rowIndex + 1, columnIndex);
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    const target = event.currentTarget;
    const atStart = target.selectionStart === 0 && target.selectionEnd === 0;
    const atEnd = target.selectionStart === target.value.length &&
      target.selectionEnd === target.value.length;
    const canMove = target.tagName !== "TEXTAREA" ||
      (event.key === "ArrowUp" ? atStart : atEnd);

    if (canMove) {
      event.preventDefault();
      focusCell(rowIndex + (event.key === "ArrowUp" ? -1 : 1), columnIndex);
    }
  };

  const openPastePreview = (text, rowIndex, columnIndex) => {
    const parsed = parseDataBookPaste(text);
    if (parsed.errors.length > 0) {
      toast.error(parsed.errors[0].message || "Unable to read the pasted cells.");
      return false;
    }
    if (parsed.matrix.length === 0) return false;
    setPaste({ matrix: parsed.matrix, startColumn: columnIndex, startRow: rowIndex });
    return true;
  };

  const handlePaste = (event, rowIndex, columnIndex) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n") && !text.includes("\r")) {
      return;
    }

    event.preventDefault();
    openPastePreview(text, rowIndex, columnIndex);
  };

  const pasteFromClipboard = async () => {
    const targetRow = Math.min(
      lastFocusedCell.row,
      Math.max(0, visibleRows.length - 1),
    );
    const targetColumn = Math.min(
      lastFocusedCell.column,
      DATA_BOOK_GRID_FIELDS.length - 1,
    );

    if (!globalThis.navigator?.clipboard?.readText) {
      focusCell(targetRow, targetColumn);
      toast.info("Copy rows in Excel, then press Ctrl+V in the selected grid cell.");
      return;
    }

    try {
      const text = await globalThis.navigator.clipboard.readText();
      if (!text.includes("\t") && !text.includes("\n") && !text.includes("\r")) {
        toast.info("Copy two or more Excel cells, then choose Paste rows again.");
        return;
      }
      openPastePreview(text, targetRow, targetColumn);
    } catch {
      focusCell(targetRow, targetColumn);
      toast.info("Press Ctrl+V in the selected cell to paste your Excel rows.");
    }
  };

  const handleSaveAll = async () => {
    const result = await grid.saveAll();
    const failedKey = result?.failedKeys?.[0];
    if (failedKey) {
      window.requestAnimationFrame(() => {
        rowRefs.current.get(failedKey)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  };

  if (activeSheet === null) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="rounded-2xl bg-brand-light p-3 text-brand">
          <Plus className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          Pick a sheet, or create one
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          A grid always shows one category at a time.
        </p>
        {capabilities.canCreate ? (
          <AppButton className="mt-5" onClick={onNewSheet}>
            <Plus className="h-4 w-4" />
            New sheet
          </AppButton>
        ) : null}
      </div>
    );
  }

  if (loading || grid.hydrating) return <GridSkeleton />;

  if (error && entries.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <h2 className="mt-4 text-sm font-semibold text-slate-900">Unable to load this sheet</h2>
        <p className="mt-1 max-w-md whitespace-pre-line text-xs leading-5 text-slate-500">{error}</p>
        <AppButton className="mt-4" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {draft.recoveredDraft && pendingCount === 0 && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><span>Unsaved rows were kept for this sheet. Restore and review before Save all.</span><AppButton variant="secondary" disabled={draft.stale} onClick={() => { grid.restoreDraft(draft.recoveredDraft.values || []); draft.acknowledgeRecovery(); }}>Restore draft</AppButton><AppButton variant="secondary" onClick={draft.clearDraft}>Discard draft</AppButton></div>}
      {pendingCount > 0 && <p className="text-xs text-amber-800">{draft.available ? "Recovery is scoped to your user, company and sheet in this browser session." : "Draft recovery needs the current company identity. Save all before leaving."} {draft.storageError} <button type="button" className="font-semibold underline" disabled={!draft.available || grid.isSaving} onClick={() => draft.saveDraft() && toast.success("Sheet draft kept for review")}>Keep draft</button></p>}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
            <ClipboardPaste className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {activeSheet || "Uncategorised"}
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Active sheet
              </span>
            </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {hasSavedRows
              ? "Edit cells directly, or use Paste rows to bring in a block from Excel."
              : "Paste from Excel or start typing. This sheet appears once you save a row."}
          </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {grid.progress ? (
            <span className="text-xs font-medium tabular-nums text-brand">
              Saving {grid.progress.current} of {grid.progress.total}…
            </span>
          ) : grid.summary ? (
            <span className={`text-xs font-medium ${grid.summary.failed ? "text-red-600" : "text-emerald-700"}`}>
              {grid.summary.saved} saved · {grid.summary.failed} failed
              {grid.summary.skipped ? ` · ${grid.summary.skipped} incomplete` : ""}
            </span>
          ) : null}
          <AppButton
            className="h-9 border-brand/20 px-3 text-brand hover:bg-brand-light"
            variant="secondary"
            onClick={pasteFromClipboard}
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste rows
          </AppButton>
          <AppButton
            className="h-9 px-3"
            variant="secondary"
            onClick={() => {
              const index = visibleRows.findIndex(isDataBookGridRowBlank);
              if (index >= 0) focusCell(index, 0);
            }}
          >
            <Plus className="h-4 w-4" />
            Add row
          </AppButton>
          <AppButton
            className="h-9 px-3"
            disabled={grid.dirtyCount === 0 || grid.isSaving}
            isLoading={grid.isSaving}
            loadingText="Saving…"
            onClick={handleSaveAll}
          >
            <Save className="h-4 w-4" />
            Save all{grid.dirtyCount ? ` (${grid.dirtyCount})` : ""}
          </AppButton>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "s") {
            event.preventDefault();
            void handleSaveAll();
          }
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[56px]" />
              <col />
              <col />
              <col />
              <col className="w-[48px]" />
              <col className="w-[112px]" />
            </colgroup>
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">#</th>
                {DATA_BOOK_GRID_FIELDS.map((field) => (
                  <HeaderCell key={`${field}-${columns[field]}`} field={field} label={columns[field]} onSave={saveHeader} />
                ))}
                <th className="px-2 py-3.5 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <Lock className="mx-auto h-3.5 w-3.5" />
                </th>
                <th className="px-2 py-3.5 text-right text-[11px] font-medium uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => {
                const newRow = row.id === undefined;
                const editable = !row.removed && (newRow
                  ? capabilities.canCreate
                  : capabilities.canEdit && row.canEdit);
                const deletingAllowed = !newRow && capabilities.canDelete && row.canDelete;
                const readOnlyLabel = "You can only edit your own private entries.";
                const fieldError = Object.values(row.fieldErrors ?? {}).filter(Boolean).join(" ");

                return (
                  <Fragment key={row.key}>
                    <tr
                      ref={(node) => {
                        if (node) rowRefs.current.set(row.key, node);
                        else rowRefs.current.delete(row.key);
                      }}
                      className={`border-l-2 border-b border-slate-100 ${rowBorder[row.status] ?? rowBorder.clean} ${editable ? "hover:bg-slate-50/50" : "bg-slate-50/60"}`}
                    >
                      <td className="px-3 py-2 text-left text-xs tabular-nums text-slate-400">
                        {row.status === "saving" ? (
                          <LoaderCircle className="h-4 w-4 animate-spin text-brand" />
                        ) : rowIndex + 1}
                      </td>
                      {DATA_BOOK_GRID_FIELDS.map((field, columnIndex) => {
                        const sharedProps = {
                          "aria-label": `${columns[field]}, row ${rowIndex + 1}`,
                          disabled: !editable,
                          onBlur: () => grid.scheduleAutoSave(row.key),
                          onChange: (event) => grid.updateCell(row.key, field, event.target.value),
                          onFocus: () => setLastFocusedCell({ column: columnIndex, row: rowIndex }),
                          onKeyDown: (event) => handleCellKeyDown(event, row, rowIndex, columnIndex, field),
                          onPaste: (event) => handlePaste(event, rowIndex, columnIndex),
                          ref: (node) => {
                            const key = `${row.key}:${columnIndex}`;
                            if (node) cellRefs.current.set(key, node);
                            else cellRefs.current.delete(key);
                          },
                          value: row[field],
                        };
                        const cellClass = `w-full rounded bg-transparent px-3 py-2 text-sm text-slate-700 outline-none focus:bg-brand-light/40 focus:ring-1 focus:ring-brand/30 disabled:cursor-not-allowed disabled:text-slate-500 ${field === "value" ? "resize-none overflow-y-auto font-mono text-xs" : ""}`;

                        return (
                          <td key={field} className="p-0 align-top">
                            {field === "value" ? (
                              <textarea
                                {...sharedProps}
                                className={cellClass}
                                rows={1}
                                onInput={(event) => {
                                  event.currentTarget.style.height = "auto";
                                  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 72)}px`;
                                }}
                              />
                            ) : (
                              <input {...sharedProps} className={cellClass} />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-1 py-1 text-center align-top">
                        <AppTooltip label={editable ? (row.isPrivate ? "Private row" : "Public row") : readOnlyLabel}>
                          <button
                            aria-label={row.isPrivate ? "Make public" : "Make private"}
                            aria-pressed={row.isPrivate}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50 ${row.isPrivate ? "bg-brand-light text-brand" : "text-slate-400 hover:bg-slate-100"}`}
                            disabled={!editable}
                            type="button"
                            onBlur={() => grid.scheduleAutoSave(row.key)}
                            onClick={() => grid.updateCell(row.key, "isPrivate", !row.isPrivate)}
                          >
                            {row.isPrivate ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                          </button>
                        </AppTooltip>
                      </td>
                      <td className="px-1 py-1 align-top">
                        <div className="flex items-center justify-end gap-0.5">
                          {!newRow ? (
                            <>
                              <ActionButton
                                icon={ClipboardCopy}
                                label="Copy value"
                                loading={String(copyingId) === String(row.id)}
                                onClick={() => onCopy(row)}
                              />
                              <ActionButton icon={History} label="View history" onClick={() => onHistory(row)} />
                              {capabilities.canDelete ? (
                                <ActionButton
                                  danger
                                  disabled={!deletingAllowed}
                                  icon={Trash2}
                                  label={deletingAllowed ? "Delete row" : "You can only delete your own private entries."}
                                  onClick={() => setDeleteTarget(row)}
                                />
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {row.privacyWarning || row.error || fieldError || row.conflict || row.removed ? (
                      <tr className="border-b border-slate-100 bg-white">
                        <td colSpan={6} className="px-3 py-2">
                          {row.privacyWarning ? (
                            <p className="text-xs text-amber-700">{row.privacyWarning}</p>
                          ) : null}
                          {row.error ? (
                            <p className="text-xs font-medium text-red-600">{row.error}</p>
                          ) : null}
                          {fieldError ? (
                            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
                          ) : null}
                          {row.conflict ? (
                            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                              <div className="grid gap-2 sm:grid-cols-[72px_1fr]">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Yours</span>
                                <code className="break-all font-mono text-xs text-red-900">{conflictLine(row.conflict.mine) || "Blank"}</code>
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Saved</span>
                                <code className="break-all font-mono text-xs text-red-900">{conflictLine(row.conflict.saved) || "Blank"}</code>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <AppButton className="h-8 px-3 text-xs" disabled={grid.isSaving} onClick={() => grid.keepMine(row.key)}>
                                  Keep mine
                                </AppButton>
                                <AppButton className="h-8 px-3 text-xs" variant="secondary" onClick={() => grid.useTheirs(row.key)}>
                                  Use theirs
                                </AppButton>
                              </div>
                            </div>
                          ) : null}
                          {row.removed ? (
                            <button
                              className="mt-2 text-xs font-semibold text-brand hover:underline"
                              type="button"
                              onClick={() => grid.clearRow(row.key)}
                            >
                              Clear this row from the grid
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DataBookPasteModal
        key={paste ? `${paste.startRow}-${paste.startColumn}-${paste.matrix.length}` : "closed"}
        columns={columns}
        isOpen={Boolean(paste)}
        matrix={paste?.matrix ?? []}
        sheetName={activeSheet || "Uncategorised"}
        startColumn={paste?.startColumn ?? 0}
        onCancel={() => setPaste(null)}
        onConfirm={(matrix) => {
          const result = grid.applyPaste({
            matrix,
            startColumn: paste.startColumn,
            startRow: paste.startRow,
          });
          setPaste(null);
          if (result.skippedReadOnly > 0) {
            toast.warning(`${result.skippedReadOnly} read-only rows were skipped.`);
          }
        }}
      />

      <DeleteEntryModal
        entry={deleteTarget}
        isLoading={deleting}
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          await grid.deleteRow(deleteTarget.key);
          setDeleting(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};

export default DataBookGrid;
