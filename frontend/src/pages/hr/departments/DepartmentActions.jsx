import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const actionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";

const DepartmentActions = ({
  canDelete = false,
  canEdit = false,
  canView = false,
  department,
  onDelete,
  onEdit,
  onView,
}) => {
  return (
    <div className="flex justify-end gap-1">
      {canView && <AppTooltip label="View department">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onView(department)}
          aria-label="View department"
        >
          <Eye className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canEdit && <AppTooltip label="Edit department">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onEdit(department)}
          aria-label="Edit department"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canDelete && <AppTooltip label="Delete department">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onDelete(department)}
          aria-label="Delete department"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AppTooltip>}
    </div>
  );
};

export default DepartmentActions;
