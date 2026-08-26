import { twMerge } from "tailwind-merge";

import StatScopeBadge from "./StatScopeBadge";

const TONES = {
  amber: {
    accent: "bg-amber-500",
    icon: "bg-amber-50 text-amber-600",
  },
  brand: {
    accent: "bg-brand",
    icon: "bg-brand-light text-brand",
  },
  emerald: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-600",
  },
  red: {
    accent: "bg-red-500",
    icon: "bg-red-50 text-red-500",
  },
  sky: {
    accent: "bg-sky-500",
    icon: "bg-sky-50 text-sky-600",
  },
  slate: {
    accent: "bg-slate-400",
    icon: "bg-slate-100 text-slate-600",
  },
  violet: {
    accent: "bg-violet-500",
    icon: "bg-violet-50 text-violet-600",
  },
};

const inferTone = (colorClass = "") => {
  if (colorClass.includes("emerald") || colorClass.includes("green")) return "emerald";
  if (colorClass.includes("amber") || colorClass.includes("orange")) return "amber";
  if (colorClass.includes("red") || colorClass.includes("rose")) return "red";
  if (colorClass.includes("sky") || colorClass.includes("blue")) return "sky";
  if (colorClass.includes("violet") || colorClass.includes("purple")) return "violet";
  if (colorClass.includes("slate") || colorClass.includes("gray")) return "slate";
  return "brand";
};

const MetricCard = ({
  accentClass,
  className = "",
  colorClass,
  footer,
  hint,
  icon: Icon,
  label,
  labelClassName = "",
  loading = false,
  meta,
  metaClassName = "",
  scope,
  tone,
  value,
  valueClassName = "",
}) => {
  const resolvedTone = tone ?? inferTone(colorClass);
  const toneClasses = TONES[resolvedTone] ?? TONES.brand;

  return (
    <article
      className={twMerge(
        "group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.42)] ring-1 ring-slate-950/[0.025] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_38px_-22px_rgba(15,23,42,0.38)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={twMerge(
          "absolute inset-x-0 top-0 h-0.5",
          toneClasses.accent,
          accentClass,
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={twMerge(
              "truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-400",
              labelClassName,
            )}
          >
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p
              className={twMerge(
                "mt-1 truncate text-xl font-bold tabular-nums text-slate-900",
                valueClassName,
              )}
            >
              {value}
            </p>
          )}
          {meta || hint ? (
            <p
              className={twMerge(
                "mt-0.5 truncate text-xs text-slate-400",
                metaClassName,
              )}
            >
              {meta || hint}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <span
            className={twMerge(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
              toneClasses.icon,
              colorClass,
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>

      <StatScopeBadge className="mt-3" scope={scope} />
      {footer ? <div className="mt-3">{footer}</div> : null}
    </article>
  );
};

export default MetricCard;
