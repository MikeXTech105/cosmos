import { Eye, Pencil, Trash2 } from "lucide-react";

import AppTooltip from "../../../components/common/AppTooltip";

const ActionButton = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const toneClass =
    tone === "danger"
      ? "hover:bg-red-50 hover:text-red-600"
      : "hover:bg-slate-100 hover:text-brand";

  return (
    <AppTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors ${toneClass}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const ItemActions = ({
  canDelete,
  canEdit,
  canView,
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
