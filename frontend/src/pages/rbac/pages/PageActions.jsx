import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { memo } from "react";

import AppTooltip from "../../../components/common/AppTooltip";

const ActionButton = ({ disabled, icon: Icon, label, onClick, tone = "default" }) => {
  const buttonClass =
    tone === "danger"
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
      : "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <AppTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        disabled={disabled}
        className={buttonClass}
      >
        <Icon className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const PageActions = ({
  canAddChild = false,
  canDelete = false,
  canEdit = false,
  canView = false,
  onAddChild,
  onDelete,
  onEdit,
  onView,
  page,
}) => {
  if (page?.isSynthetic) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      {canView && onView && (
        <ActionButton
          icon={Eye}
          label="View Page"
          onClick={() => onView(page)}
        />
      )}
      {canAddChild && onAddChild && (
        <ActionButton
          icon={Plus}
          label="Add Child Page"
          onClick={() => onAddChild(page)}
        />
      )}
      {canEdit && onEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit Page"
          onClick={() => onEdit(page)}
        />
      )}
      {canDelete && onDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete Page"
          onClick={() => onDelete(page)}
          tone="danger"
        />
      )}
    </div>
  );
};

export default memo(PageActions);
