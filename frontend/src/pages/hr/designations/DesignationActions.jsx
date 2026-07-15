import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const actionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";

const DesignationActions = ({
  canDelete = false,
  canEdit = false,
  canView = false,
  designation,
  onDelete,
  onEdit,
  onView,
}) => {
  return (
    <div className="flex justify-end gap-1">
      {canView && <AppTooltip label="View designation">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onView(designation)}
          aria-label="View designation"
        >
          <Eye className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canEdit && <AppTooltip label="Edit designation">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onEdit(designation)}
          aria-label="Edit designation"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canDelete && <AppTooltip label="Delete designation">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onDelete(designation)}
          aria-label="Delete designation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AppTooltip>}
    </div>
  );
};

export default DesignationActions;
