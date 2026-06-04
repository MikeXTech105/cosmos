import { CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";

const ActionButton = ({
  children,
  className,
  disabled,
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={[
          "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-45",
          className,
        ].join(" ")}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">{children}</span>
      </button>

      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
};

const UserActions = ({
  canActivate = true,
  canDeactivate = true,
  canDelete = true,
  canEdit = true,
  user,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
}) => {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {canEdit && (
        <ActionButton
          icon={Pencil}
          label={`Edit ${user.fullName || user.username}`}
          onClick={() => onEdit(user)}
          className="bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-white hover:text-slate-950 hover:shadow-sm"
        >
          Edit
        </ActionButton>
      )}

      {user.isActive ? (
        canDeactivate && (
          <ActionButton
            icon={XCircle}
            label={`Deactivate ${user.fullName || user.username}`}
            onClick={() => onDeactivate(user)}
            className="bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100 hover:bg-amber-100"
          >
            Deactivate
          </ActionButton>
        )
      ) : (
        canActivate && (
          <ActionButton
            icon={CheckCircle2}
            label={`Activate ${user.fullName || user.username}`}
            onClick={() => onActivate(user)}
            className="bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 hover:bg-emerald-100"
          >
            Activate
          </ActionButton>
        )
      )}

      {canDelete && (
        <ActionButton
          icon={Trash2}
          label={`Delete ${user.fullName || user.username}`}
          onClick={() => onDelete(user)}
          className="bg-red-50 text-red-700 ring-1 ring-inset ring-red-100 hover:bg-red-100"
        >
          Delete
        </ActionButton>
      )}
    </div>
  );
};

export default UserActions;
