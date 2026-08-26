import {
  ClipboardCopy,
  Eye,
  History,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import AppTooltip from "../../components/common/AppTooltip";
import {
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../components/common/DataTableShell";
import {
  canDeleteDataBookEntry,
  canEditDataBookEntry,
} from "../../utils/dataBookPermissions";

const ActionButton = ({
  danger = false,
  disabled = false,
  icon: Icon,
  label,
  loading = false,
  onClick,
}) => (
  <AppTooltip label={label}>
    <button
      type="button"
      aria-label={label}
      className={
        danger
          ? DATA_TABLE_ROW_ACTION_DANGER_CLASS
          : DATA_TABLE_ROW_ACTION_CLASS
      }
      disabled={disabled || loading}
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

const DataBookActions = ({
  capabilities,
  copyingId,
  entry,
  onCopy,
  onDelete,
  onEdit,
  onHistory,
  onView,
}) => {
  const editAllowed = canEditDataBookEntry(capabilities, entry);
  const deleteAllowed = canDeleteDataBookEntry(capabilities, entry);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <ActionButton
        icon={ClipboardCopy}
        label="Copy value"
        loading={String(copyingId) === String(entry.id)}
        onClick={() => onCopy(entry)}
      />
      <ActionButton
        icon={Eye}
        label="View entry"
        onClick={() => onView(entry)}
      />
      <ActionButton
        icon={History}
        label="View history"
        onClick={() => onHistory(entry)}
      />
      {capabilities.canEdit && (
        <ActionButton
          disabled={!editAllowed}
          icon={Pencil}
          label={
            editAllowed
              ? "Edit entry"
              : "You can only edit your own private entries."
          }
          onClick={() => onEdit(entry)}
        />
      )}
      {capabilities.canDelete && (
        <ActionButton
          danger
          disabled={!deleteAllowed}
          icon={Trash2}
          label={
            deleteAllowed
              ? "Delete entry"
              : "You can only delete your own private entries."
          }
          onClick={() => onDelete(entry)}
        />
      )}
    </div>
  );
};

export default DataBookActions;
