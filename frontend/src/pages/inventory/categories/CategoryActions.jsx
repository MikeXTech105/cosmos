import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const ActionButton = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const buttonClass =
    tone === "danger"
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
      : "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <AppTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={buttonClass}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const CategoryActions = ({
  canDelete = false,
  canEdit = false,
  canView = false,
  category,
  onDelete,
  onEdit,
  onView,
}) => {
  return (
    <div className="flex items-center justify-end gap-2 md:gap-0.5">
      {canView && (
        <ActionButton
          icon={Eye}
          label="View Category"
          onClick={() => onView(category)}
        />
      )}
      {canEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit Category"
          onClick={() => onEdit(category)}
        />
      )}
      {canDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete Category"
          tone="danger"
          onClick={() => onDelete(category)}
        />
      )}
    </div>
  );
};

export default CategoryActions;
