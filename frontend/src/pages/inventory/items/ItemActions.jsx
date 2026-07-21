import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const ActionButton = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const buttonClass =
    tone === "danger"
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
      : "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <AppTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={buttonClass}
      >
        <Icon className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const ItemActions = ({
  canDelete = false,
  canEdit = false,
  canView = false,
  item,
  onDelete,
  onEdit,
  onView,
}) => {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {canView && (
        <ActionButton
          icon={Eye}
          label="View Item"
          onClick={() => onView(item)}
        />
      )}
      {canEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit Item"
          onClick={() => onEdit(item)}
        />
      )}
      {canDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete Item"
          tone="danger"
          onClick={() => onDelete(item)}
        />
      )}
    </div>
  );
};

export default ItemActions;
