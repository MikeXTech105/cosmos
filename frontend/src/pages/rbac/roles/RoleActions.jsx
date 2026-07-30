import {
  CheckCircle2,
  Eye,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
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

const RoleActions = ({
  canActivate = false,
  canDeactivate = false,
  canDelete = false,
  canEdit = false,
  canView = false,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
  onView,
  role,
}) => {
  return (
    <div className="flex items-center justify-end gap-2 md:gap-0.5">
      {canView && (
        <ActionButton
          icon={Eye}
          label="View Role"
          onClick={() => onView(role)}
        />
      )}

      {canEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit Role"
          onClick={() => onEdit(role)}
        />
      )}

      {role.isActive ? (
        canDeactivate && (
          <ActionButton
            icon={XCircle}
            label="Deactivate Role"
            onClick={() => onDeactivate(role)}
          />
        )
      ) : (
        canActivate && (
          <ActionButton
            icon={CheckCircle2}
            label="Activate Role"
            onClick={() => onActivate(role)}
          />
        )
      )}

      {canDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete Role"
          onClick={() => onDelete(role)}
          tone="danger"
        />
      )}
    </div>
  );
};

export default memo(RoleActions);
