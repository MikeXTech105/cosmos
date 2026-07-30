import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const actionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";
const dangerActionButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

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
    <div className="flex items-center justify-end gap-2 md:gap-0.5">
      {canView && <AppTooltip label="View department">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onView(department)}
          aria-label="View department"
        >
          <Eye aria-hidden="true" className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canEdit && <AppTooltip label="Edit department">
        <button
          type="button"
          className={actionButtonClass}
          onClick={() => onEdit(department)}
          aria-label="Edit department"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </button>
      </AppTooltip>}

      {canDelete && <AppTooltip label="Delete department">
        <button
          type="button"
          className={dangerActionButtonClass}
          onClick={() => onDelete(department)}
          aria-label="Delete department"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </AppTooltip>}
    </div>
  );
};

export default DepartmentActions;
