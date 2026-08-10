import { NotebookText, Plus, RefreshCw } from "lucide-react";

import AppButton from "../../components/common/AppButton";
import DataTableShell from "../../components/common/DataTableShell";
import DataBookActions from "./DataBookActions";
import VisibilityPill from "./VisibilityPill";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const DataBookTable = ({
  capabilities,
  copyingId,
  entries,
  error,
  loading,
  onCopy,
  onCreate,
  onDelete,
  onEdit,
  onHistory,
  onRetry,
  onView,
  pageNumber,
  pageSize,
}) => (
  <DataTableShell
    columnCount={9}
    emptyAction={
      error ? (
        <AppButton variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </AppButton>
      ) : capabilities.canCreate ? (
        <AppButton onClick={onCreate}>
          <Plus className="h-4 w-4" />
          New entry
        </AppButton>
      ) : null
    }
    emptyHint={
      error
        ? error
        : "Create the first entry or adjust the current filters."
    }
    emptyIcon={NotebookText}
    emptyTitle={
      !loading && (error || entries.length === 0)
        ? error
          ? "Unable to load Data Book"
          : "No entries found"
        : ""
    }
    loading={loading}
    minWidth="min-w-[1320px]"
    rows={7}
    colGroup={
      <colgroup>
        <col className="w-[56px]" />
        <col className="w-[190px]" />
        <col className="w-[210px]" />
        <col className="w-[140px]" />
        <col className="w-[115px]" />
        <col className="w-[150px]" />
        <col className="w-[150px]" />
        <col className="w-[175px]" />
        <col className="w-[220px]" />
      </colgroup>
    }
    head={
      <>
        <th>#</th>
        <th>Name</th>
        <th>Value preview</th>
        <th>Category</th>
        <th>Visibility</th>
        <th>Owner</th>
        <th>Updated by</th>
        <th>Updated at</th>
        <th className="!text-right">Actions</th>
      </>
    }
  >
    {entries.map((entry, index) => (
      <tr key={entry.id}>
        <td className="px-4 py-3.5 text-left text-xs font-semibold tabular-nums text-slate-400">
          {(pageNumber - 1) * pageSize + index + 1}
        </td>
        <td>
          <p className="truncate font-semibold text-slate-900" title={entry.name}>
            {entry.name || "—"}
          </p>
          {entry.description ? (
            <p className="mt-0.5 truncate text-xs text-slate-500" title={entry.description}>
              {entry.description}
            </p>
          ) : null}
        </td>
        <td>
          <div className="flex min-w-0 items-center gap-1">
            <span
              className="min-w-0 truncate font-mono text-xs text-slate-600"
              title={entry.valuePreview ?? ""}
            >
              {entry.valuePreview || "—"}
            </span>
            {entry.valuePreview ? (
              <span aria-hidden="true" className="shrink-0 text-xs text-slate-400">
                …
              </span>
            ) : null}
          </div>
        </td>
        <td className="text-sm text-slate-600">{entry.category || "—"}</td>
        <td><VisibilityPill isPrivate={entry.isPrivate} /></td>
        <td>{entry.isPrivate ? entry.ownerUserName || "—" : "—"}</td>
        <td>{entry.updatedByName || "—"}</td>
        <td className="text-xs tabular-nums text-slate-500">
          {formatDateTime(entry.updatedAtUtc)}
        </td>
        <td>
          <DataBookActions
            capabilities={capabilities}
            copyingId={copyingId}
            entry={entry}
            onCopy={onCopy}
            onDelete={onDelete}
            onEdit={onEdit}
            onHistory={onHistory}
            onView={onView}
          />
        </td>
      </tr>
    ))}
  </DataTableShell>
);

export default DataBookTable;
