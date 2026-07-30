import { CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";
import { memo } from "react";

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
        onClick={onClick}
        aria-label={label}
        className={buttonClass}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const UserActions = ({
  canActivate = false,
  canDeactivate = false,
  canDelete = false,
  canEdit = false,
  user,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
}) => {
  return (
    <div className="flex items-center justify-end gap-2 md:gap-0.5">
      {canEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit User"
          onClick={() => onEdit(user)}
        />
      )}

      {user.isActive ? (
        canDeactivate && (
          <ActionButton
            icon={XCircle}
            label="Deactivate User"
            onClick={() => onDeactivate(user)}
          />
        )
      ) : (
        canActivate && (
          <ActionButton
            icon={CheckCircle2}
            label="Activate User"
            onClick={() => onActivate(user)}
          />
        )
      )}

      {canDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete User"
          onClick={() => onDelete(user)}
          tone="danger"
        />
      )}
    </div>
  );
};

export default memo(UserActions);
