import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { dataBookService } from "../../services/dataBook/dataBookService";
import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiFieldErrors,
  getApiStatus,
} from "../../utils/apiError";

export const DATA_BOOK_GRID_FIELDS = Object.freeze([
  "name",
  "value",
  "description",
]);

const CONCURRENCY_CODE = "DATA_BOOK_ENTRY_CONCURRENCY_CONFLICT";
let rowSequence = 0;

const nextRowKey = () => {
  rowSequence += 1;
  return `data-book-grid-${Date.now()}-${rowSequence}`;
};

const getConflictCode = (error) =>
  error?.conflictCode ??
  error?.data?.conflictCode ??
  error?.apiError?.conflictCode ??
  error?.apiError?.data?.conflictCode ??
  error?.response?.data?.conflictCode ??
  error?.response?.data?.data?.conflictCode;

export const isDataBookGridConflict = (error) =>
  getApiStatus(error) === 409 && getConflictCode(error) === CONCURRENCY_CODE;

export const extractDataBookEntry = (response) =>
  response?.data?.entry ??
  response?.data?.dataBookEntry ??
  response?.data?.record ??
  response?.data ??
  response?.entry ??
  response?.dataBookEntry ??
  response?.record ??
  response;

const snapshotFromEntry = (entry) => ({
  category: String(entry?.category ?? ""),
  description: String(entry?.description ?? ""),
  isPrivate: Boolean(entry?.isPrivate),
  name: String(entry?.name ?? ""),
  value: String(entry?.value ?? entry?.valuePreview ?? ""),
});

export const createDataBookGridRow = (entry, category = "") => {
  const snapshot = snapshotFromEntry({
    ...entry,
    category: entry?.category ?? category,
  });

  return {
    ...entry,
    ...snapshot,
    canDelete: entry?.canDelete !== false,
    canEdit: entry?.canEdit !== false,
    conflict: null,
    editVersion: 0,
    error: "",
    fieldErrors: {},
    fullValueLoaded: entry?.value !== undefined,
    key: entry?.key ?? (entry?.id !== undefined ? `entry-${entry.id}` : nextRowKey()),
    loadError: false,
    privacyWarning: "",
    removed: false,
    savedSnapshot: entry?.id !== undefined ? snapshot : null,
    status: "clean",
  };
};

export const createBlankDataBookGridRow = (category = "") =>
  createDataBookGridRow({
    canDelete: false,
    canEdit: true,
    category,
    description: "",
    isPrivate: false,
    name: "",
    value: "",
  }, category);

export const isDataBookGridRowBlank = (row) =>
  !row?.id &&
  DATA_BOOK_GRID_FIELDS.every((field) => String(row?.[field] ?? "") === "");

export const isDataBookGridRowValid = (row) =>
  Boolean(String(row?.name ?? "").trim() && String(row?.value ?? "").trim());

export const isDataBookGridRowDirty = (row) =>
  ["dirty", "error"].includes(row?.status) &&
  !row?.loadError &&
  !row?.removed &&
  !row?.conflict;

export const getDataBookGridPayload = (row, rowVersion = row?.rowVersion) => ({
  category: String(row?.category ?? "").trim(),
  description: String(row?.description ?? "").trim(),
  isPrivate: Boolean(row?.isPrivate),
  name: String(row?.name ?? "").trim(),
  value: String(row?.value ?? "").trim(),
  ...(row?.id !== undefined ? { rowVersion } : {}),
});

const assertSavedEntry = (response) => {
  const entry = extractDataBookEntry(response);

  if (
    !entry ||
    typeof entry !== "object" ||
    entry.id === undefined ||
    entry.rowVersion === undefined ||
    entry.name === undefined ||
    entry.value === undefined
  ) {
    throw new Error("The server did not return the saved entry.");
  }

  return entry;
};

export const commitDataBookGridRow = (
  currentRow,
  serverEntry,
  expectedEditVersion = currentRow.editVersion,
) => {
  const committed = createDataBookGridRow(serverEntry, currentRow.category);
  const wasEditedDuringSave = currentRow.editVersion !== expectedEditVersion;

  if (wasEditedDuringSave) {
    return {
      ...currentRow,
      canDelete: committed.canDelete,
      canEdit: committed.canEdit,
      id: committed.id,
      rowVersion: committed.rowVersion,
      savedSnapshot: committed.savedSnapshot,
      status: "dirty",
    };
  }

  return {
    ...currentRow,
    ...committed,
    editVersion: currentRow.editVersion,
    key: currentRow.key,
    status: "saved",
  };
};

export const reapplyDataBookGridConflict = (row) => {
  const freshRowVersion = row?.conflict?.saved?.rowVersion;
  if (freshRowVersion === undefined) return row;

  return {
    ...row,
    conflict: null,
    rowVersion: freshRowVersion,
    status: "dirty",
  };
};

export const saveDataBookRowsSequentially = async ({
  api,
  onError,
  onStart,
  onSuccess,
  rows,
}) => {
  const candidates = rows.filter(
    (row) => isDataBookGridRowDirty(row) && isDataBookGridRowValid(row),
  );
  const result = { attempted: candidates.length, failed: 0, failedKeys: [], saved: 0 };

  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    const payload = getDataBookGridPayload(row);

    await onStart?.(row, index, candidates.length);

    try {
      const response = row.id !== undefined
        ? await api.updateEntry(row.id, payload)
        : await api.createEntry(payload);
      const serverEntry = assertSavedEntry(response);
      result.saved += 1;
      await onSuccess?.(
        row,
        commitDataBookGridRow(row, serverEntry, row.editVersion),
        serverEntry,
        index,
        candidates.length,
      );
    } catch (error) {
      result.failed += 1;
      result.failedKeys.push(row.key);
      await onError?.(row, error, index, candidates.length);
    }
  }

  return result;
};

const formatError = (error, fallback) => {
  const message = getApiStatus(error) === 404
    ? "Entry not found."
    : getApiErrorMessage(error, fallback);
  const correlationId = getApiCorrelationId(error);

  return correlationId && !message.includes(correlationId)
    ? `${message} Ref: ${correlationId}`
    : message;
};

const ensureTrailingBlank = (rows, category) => {
  const visibleRows = rows.filter((row) => !row.removed);
  const last = visibleRows.at(-1);

  return last && isDataBookGridRowBlank(last)
    ? rows
    : [...rows, createBlankDataBookGridRow(category)];
};

const rowMatchesSnapshot = (row) => {
  if (!row.savedSnapshot) return isDataBookGridRowBlank(row);

  return ["name", "value", "description", "category", "isPrivate"]
    .every((field) => row[field] === row.savedSnapshot[field]);
};

const useDataBookGrid = ({
  activeSheet,
  api = dataBookService,
  entries,
  onCommitted,
}) => {
  const category = activeSheet ?? "";
  const [rows, setRows] = useState(() => [createBlankDataBookGridRow(category)]);
  const [hydrating, setHydrating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  const rowsRef = useRef(rows);
  const hydrationRef = useRef(0);
  const savingRef = useRef(false);
  const autoSaveTimersRef = useRef(new Map());
  const savedTimersRef = useRef(new Map());

  const replaceRows = useCallback((value) => {
    const nextRows = ensureTrailingBlank(
      typeof value === "function" ? value(rowsRef.current) : value,
      category,
    );
    rowsRef.current = nextRows;
    setRows(nextRows);
    return nextRows;
  }, [category]);

  useEffect(() => {
    const requestId = ++hydrationRef.current;
    const scopedEntries = activeSheet === null
      ? []
      : entries.filter((entry) =>
          activeSheet === ""
            ? !String(entry.category ?? "").trim()
            : String(entry.category ?? "") === activeSheet,
        );
    const initialRows = scopedEntries.map((entry) =>
      createDataBookGridRow(entry, category),
    );

    const preservePending = (serverRows) => {
      const pending = rowsRef.current.filter((row) => (isDataBookGridRowDirty(row) || row.conflict || row.status === "saving") && String(row.category ?? "") === category);
      const pendingKeys = new Set(pending.map((row) => row.key));
      return [...serverRows.filter((row) => !pendingKeys.has(row.key)), ...pending];
    };
    replaceRows(preservePending(initialRows));
    setSummary(null);

    if (scopedEntries.length === 0) {
      setHydrating(false);
      return undefined;
    }

    setHydrating(true);
    const hydrated = [...initialRows];
    let cursor = 0;

    const worker = async () => {
      while (cursor < scopedEntries.length) {
        const index = cursor;
        cursor += 1;

        try {
          const response = await api.getEntryById(scopedEntries[index].id);
          const detail = extractDataBookEntry(response);
          hydrated[index] = createDataBookGridRow({
            ...scopedEntries[index],
            ...detail,
          }, category);
        } catch (error) {
          if (getApiStatus(error) === 404) {
            hydrated[index] = null;
          } else {
            hydrated[index] = {
              ...initialRows[index],
              canEdit: false,
              error: formatError(error, "Unable to load the full entry."),
              loadError: true,
              status: "error",
            };
          }
        }
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(3, scopedEntries.length) }, worker),
    ).then(() => {
      if (hydrationRef.current !== requestId) return;
      replaceRows(preservePending(hydrated.filter(Boolean)));
      setHydrating(false);
    });

    return () => {
      if (hydrationRef.current === requestId) {
        hydrationRef.current += 1;
      }
    };
  }, [activeSheet, api, category, entries, replaceRows]);

  useEffect(() => () => {
    autoSaveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    savedTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const updateCell = useCallback((rowKey, field, value) => {
    replaceRows((currentRows) => currentRows.map((row) => {
      if (row.key !== rowKey || row[field] === value) return row;

      const next = {
        ...row,
        [field]: value,
        conflict: null,
        editVersion: row.editVersion + 1,
        error: "",
        fieldErrors: {},
        privacyWarning: field === "isPrivate"
          ? value
            ? "This becomes your private row and disappears from everyone else's list."
            : "This becomes visible to everyone with Data Book access."
          : row.privacyWarning,
        status: "dirty",
      };

      if (rowMatchesSnapshot(next)) {
        next.status = "clean";
        next.privacyWarning = "";
      }

      return next;
    }));
  }, [replaceRows]);

  const revertCell = useCallback((rowKey, field) => {
    replaceRows((currentRows) => currentRows.map((row) => {
      if (row.key !== rowKey) return row;
      const fallback = row.savedSnapshot?.[field] ?? (field === "isPrivate" ? false : "");
      const next = {
        ...row,
        [field]: fallback,
        conflict: null,
        editVersion: row.editVersion + 1,
        error: "",
        fieldErrors: {},
        privacyWarning: "",
      };
      next.status = rowMatchesSnapshot(next) ? "clean" : "dirty";
      return next;
    }));
  }, [replaceRows]);

  const loadConflict = useCallback(async (rowKey) => {
    const selected = rowsRef.current.find((row) => row.key === rowKey);
    if (!selected?.id) return;

    replaceRows((currentRows) => currentRows.map((row) =>
      row.key === rowKey
        ? { ...row, error: "Changed by someone else.", status: "error" }
        : row,
    ));

    try {
      const response = await api.getEntryById(selected.id);
      const saved = createDataBookGridRow(
        extractDataBookEntry(response),
        selected.category,
      );
      replaceRows((currentRows) => currentRows.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              conflict: {
                mine: snapshotFromEntry(row),
                saved,
              },
              error: "Changed by someone else.",
              status: "error",
            }
          : row,
      ));
    } catch (error) {
      replaceRows((currentRows) => currentRows.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              conflict: null,
              error: formatError(error, "Unable to load the saved entry."),
              removed: getApiStatus(error) === 404,
              status: "error",
            }
          : row,
      ));
    }
  }, [api, replaceRows]);

  const saveRows = useCallback(async (rowKeys) => {
    if (savingRef.current) return null;

    const keySet = rowKeys ? new Set(rowKeys) : null;
    const candidates = rowsRef.current.filter((row) =>
      (!keySet || keySet.has(row.key)) && isDataBookGridRowDirty(row),
    );
    const validCandidates = candidates.filter(isDataBookGridRowValid);

    if (validCandidates.length === 0) {
      setSummary(candidates.length > 0
        ? { failed: 0, saved: 0, skipped: candidates.length }
        : null);
      return { attempted: 0, failed: 0, failedKeys: [], saved: 0 };
    }

    savingRef.current = true;
    setIsSaving(true);
    setSummary(null);
    setProgress({ current: 0, total: validCandidates.length });

    const result = await saveDataBookRowsSequentially({
      api,
      rows: validCandidates,
      onStart: async (row, index, total) => {
        setProgress({ current: index + 1, total });
        replaceRows((currentRows) => currentRows.map((current) =>
          current.key === row.key
            ? { ...current, error: "", fieldErrors: {}, status: "saving" }
            : current,
        ));
      },
      onSuccess: async (row, committed, serverEntry) => {
        replaceRows((currentRows) => currentRows.map((current) =>
          current.key === row.key
            ? commitDataBookGridRow(current, serverEntry, row.editVersion)
            : current,
        ));
        onCommitted?.(serverEntry);

        const existingTimer = savedTimersRef.current.get(row.key);
        if (existingTimer) window.clearTimeout(existingTimer);
        savedTimersRef.current.set(row.key, window.setTimeout(() => {
          replaceRows((currentRows) => currentRows.map((current) =>
            current.key === row.key && current.status === "saved"
              ? { ...current, status: "clean" }
              : current,
          ));
          savedTimersRef.current.delete(row.key);
        }, 2000));
      },
      onError: async (row, error) => {
        if (isDataBookGridConflict(error)) {
          await loadConflict(row.key);
          return;
        }

        replaceRows((currentRows) => currentRows.map((current) =>
          current.key === row.key
            ? {
                ...current,
                error: formatError(error, "Unable to save this row."),
                fieldErrors: getApiFieldErrors(error),
                status: "error",
              }
            : current,
        ));
      },
    });

    const skipped = candidates.length - validCandidates.length;
    setSummary({ failed: result.failed, saved: result.saved, skipped });
    setProgress(null);
    setIsSaving(false);
    savingRef.current = false;
    return result;
  }, [api, loadConflict, onCommitted, replaceRows]);

  const scheduleAutoSave = useCallback((rowKey) => {
    const currentTimer = autoSaveTimersRef.current.get(rowKey);
    if (currentTimer) window.clearTimeout(currentTimer);

    const row = rowsRef.current.find((item) => item.key === rowKey);
    if (!row || !isDataBookGridRowDirty(row) || !isDataBookGridRowValid(row)) {
      return;
    }

    autoSaveTimersRef.current.set(rowKey, window.setTimeout(() => {
      autoSaveTimersRef.current.delete(rowKey);
      void saveRows([rowKey]);
    }, 800));
  }, [saveRows]);

  const applyPaste = useCallback(({ matrix, startColumn, startRow }) => {
    let skippedReadOnly = 0;

    replaceRows((currentRows) => {
      const nextRows = [...currentRows];

      matrix.forEach((values, rowOffset) => {
        const targetIndex = startRow + rowOffset;
        while (targetIndex >= nextRows.length) {
          nextRows.push(createBlankDataBookGridRow(category));
        }

        const target = nextRows[targetIndex];
        if (target.id !== undefined && target.canEdit === false) {
          skippedReadOnly += 1;
          return;
        }

        let next = { ...target };
        values.slice(0, DATA_BOOK_GRID_FIELDS.length - startColumn)
          .forEach((value, columnOffset) => {
            const field = DATA_BOOK_GRID_FIELDS[startColumn + columnOffset];
            next[field] = String(value ?? "");
          });
        next = {
          ...next,
          conflict: null,
          editVersion: target.editVersion + 1,
          error: "",
          fieldErrors: {},
          status: rowMatchesSnapshot(next) ? "clean" : "dirty",
        };
        nextRows[targetIndex] = next;
      });

      return nextRows;
    });

    return { skippedReadOnly };
  }, [category, replaceRows]);

  const keepMine = useCallback(async (rowKey) => {
    const row = rowsRef.current.find((item) => item.key === rowKey);
    if (!row?.conflict?.saved?.rowVersion) return null;

    replaceRows((currentRows) => currentRows.map((current) =>
      current.key === rowKey
        ? reapplyDataBookGridConflict(current)
        : current,
    ));

    return saveRows([rowKey]);
  }, [replaceRows, saveRows]);

  const useTheirs = useCallback((rowKey) => {
    replaceRows((currentRows) => currentRows.map((row) => {
      if (row.key !== rowKey || !row.conflict?.saved) return row;
      const saved = row.conflict.saved;
      return {
        ...row,
        ...saved,
        conflict: null,
        editVersion: row.editVersion + 1,
        error: "",
        key: row.key,
        status: "clean",
      };
    }));
  }, [replaceRows]);

  const deleteRow = useCallback(async (rowKey) => {
    const row = rowsRef.current.find((item) => item.key === rowKey);
    if (!row?.id || savingRef.current) return false;

    replaceRows((currentRows) => currentRows.map((current) =>
      current.key === rowKey ? { ...current, error: "", status: "saving" } : current,
    ));

    try {
      await api.deleteEntry(row.id, row.rowVersion);
      replaceRows((currentRows) => currentRows.filter((current) => current.key !== rowKey));
      onCommitted?.(null);
      return true;
    } catch (error) {
      if (isDataBookGridConflict(error)) {
        await loadConflict(rowKey);
      } else {
        replaceRows((currentRows) => currentRows.map((current) =>
          current.key === rowKey
            ? {
                ...current,
                error: formatError(error, "Unable to delete this row."),
                removed: getApiStatus(error) === 404,
                status: "error",
              }
            : current,
        ));
      }
      return false;
    }
  }, [api, loadConflict, onCommitted, replaceRows]);

  const clearRow = useCallback((rowKey) => {
    replaceRows((currentRows) => currentRows.filter((row) => row.key !== rowKey));
  }, [replaceRows]);

  const dirtyCount = useMemo(
    () => rows.filter((row) => isDataBookGridRowDirty(row)).length,
    [rows],
  );

  return {
    restoreDraft: (draftRows) => replaceRows((current) => {
      const pendingIds = new Set(draftRows.filter((row) => row.id !== undefined).map((row) => String(row.id)));
      return [...current.filter((row) => !isDataBookGridRowBlank(row) && !pendingIds.has(String(row.id))), ...draftRows.map((row) => ({ ...row, status: "dirty", error: "", conflict: null }))];
    }),
    applyPaste,
    clearRow,
    deleteRow,
    dirtyCount,
    hydrating,
    isSaving,
    keepMine,
    progress,
    revertCell,
    rows,
    saveAll: saveRows,
    scheduleAutoSave,
    summary,
    updateCell,
    useTheirs,
  };
};

export default useDataBookGrid;
