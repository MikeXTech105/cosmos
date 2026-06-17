import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const actionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";

const ShiftActions = ({
  canDelete,
  canEdit,
  canView,
  onDelete,
  onEdit,
  onView,
  shift,
}) => {
  return (
    <div className="flex justify-end gap-1">
      <AppTooltip label="View shift">
        <button
          type="button"
          className={actionButtonClass}
          disabled={!canView}
          onClick={() => onView(shift)}
          aria-label="View shift"
        >
          <Eye className="h-4 w-4" />
        </button>
      </AppTooltip>

      <AppTooltip label="Edit shift">
        <button
          type="button"
          className={actionButtonClass}
          disabled={!canEdit}
          onClick={() => onEdit(shift)}
          aria-label="Edit shift"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </AppTooltip>

      <AppTooltip label="Delete shift">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canDelete}
          onClick={() => onDelete(shift)}
          aria-label="Delete shift"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AppTooltip>
    </div>
  );
};

export default ShiftActions;
