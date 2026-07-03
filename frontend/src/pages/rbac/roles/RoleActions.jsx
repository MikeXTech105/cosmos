import {
  CheckCircle2,
  Eye,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { memo } from "react";

import AppTooltip from "../../../components/common/AppTooltip";

const ActionButton = ({ className, icon: Icon, label, onClick }) => {
  return (
    <AppTooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
          className,
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};

const RoleActions = ({
  canActivate = true,
  canDeactivate = true,
  canDelete = true,
  canEdit = true,
  canView = true,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
  onView,
  role,
}) => {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {canView && (
        <ActionButton
          icon={Eye}
          label="View Role"
          onClick={() => onView(role)}
          className="hover:text-brand"
        />
      )}

      {canEdit && (
        <ActionButton
          icon={Pencil}
          label="Edit Role"
          onClick={() => onEdit(role)}
          className="hover:text-brand"
        />
      )}

      {role.isActive ? (
        canDeactivate && (
          <ActionButton
            icon={XCircle}
            label="Deactivate Role"
            onClick={() => onDeactivate(role)}
            className="hover:bg-amber-50 hover:text-amber-700"
          />
        )
      ) : (
        canActivate && (
          <ActionButton
            icon={CheckCircle2}
            label="Activate Role"
            onClick={() => onActivate(role)}
            className="hover:bg-emerald-50 hover:text-emerald-700"
          />
        )
      )}

      {canDelete && (
        <ActionButton
          icon={Trash2}
          label="Delete Role"
          onClick={() => onDelete(role)}
          className="hover:bg-red-50 hover:text-red-700"
        />
      )}
    </div>
  );
};

export default memo(RoleActions);
