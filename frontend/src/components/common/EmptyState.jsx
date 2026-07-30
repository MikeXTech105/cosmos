import {
  AlertCircle,
  FilterX,
  PackageSearch,
  Plus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import AppButton from "./AppButton";

const VARIANT_DEFAULTS = {
  empty: {
    actionLabel: "Create",
    Icon: PackageSearch,
    ActionIcon: Plus,
  },
  error: {
    actionLabel: "Retry",
    Icon: AlertCircle,
    ActionIcon: RefreshCw,
  },
  filtered: {
    actionLabel: "Clear filters",
    Icon: FilterX,
    ActionIcon: RotateCcw,
  },
};

const EmptyState = ({
  action,
  actionLabel,
  context,
  hint,
  icon,
  onAction,
  title,
  variant = "empty",
}) => {
  const defaults = VARIANT_DEFAULTS[variant] ?? VARIANT_DEFAULTS.empty;
  const Icon = icon ?? defaults.Icon;
  const ActionIcon = defaults.ActionIcon;

  return (
    <div role={variant === "error" ? "alert" : undefined} className="py-12 text-center">
      {context ? (
        <p className="mx-auto mb-5 max-w-xl text-xs leading-5 text-slate-500">
          {context}
        </p>
      ) : null}
      <Icon aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300" />
      <h3 className="mt-3 text-sm font-medium text-slate-900">{title}</h3>
      {hint ? (
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
      {!action && onAction ? (
        <AppButton
          className="mt-4"
          variant={variant === "empty" ? "primary" : "secondary"}
          onClick={onAction}
        >
          <ActionIcon aria-hidden="true" className="h-4 w-4" />
          {actionLabel ?? defaults.actionLabel}
        </AppButton>
      ) : null}
    </div>
  );
};

export default EmptyState;
