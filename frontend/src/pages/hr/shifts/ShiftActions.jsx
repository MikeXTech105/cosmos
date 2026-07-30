import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const actionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";
const dangerActionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

const ShiftActions = ({
  canDelete = false,
  canEdit = false,
  canView = false,
  onDelete,
  onEdit,
  onView,
  shift,
}) => {
  return (
    <div className="flex items-center justify-end gap-2 md:gap-0.5">
      {canView && <AppTooltip label="View shift">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onView(shift)}
          aria-label="View shift"
        >
          <Eye aria-hidden="true" className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canEdit && <AppTooltip label="Edit shift">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onEdit(shift)}
          aria-label="Edit shift"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canDelete && <AppTooltip label="Delete shift">
        <button
          type="button"
          className={dangerActionButtonClass}
          onClick={() => onDelete(shift)}
          aria-label="Delete shift"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </AppTooltip>}
    </div>
  );
};

export default ShiftActions;
