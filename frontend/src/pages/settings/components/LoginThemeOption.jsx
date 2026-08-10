import { Check } from "lucide-react";

const LoginThemeOption = ({ authTheme, onSelect, option }) => {
  const Icon = option.icon;
  const isSelected = authTheme === option.value;
  const isDark = option.value === "dark";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={[
        "group rounded-xl border bg-white p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-2",
        isSelected
          ? "border-brand bg-brand-light/40 shadow-sm"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
      ].join(" ")}
      onClick={() => onSelect(option.value)}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isSelected ? "bg-white shadow-sm" : "bg-slate-100",
          ].join(" ")}
        >
          <Icon
            className={[
              "h-4 w-4",
              isSelected ? option.activeIconClassName : "text-slate-400",
            ].join(" ")}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {option.label}
            </span>
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                isSelected
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-white text-transparent",
              ].join(" ")}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
            {option.description}
          </span>
        </span>
      </div>

      <span
        className={[
          "mt-3 flex h-16 items-center justify-center overflow-hidden rounded-lg border",
          isDark
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-slate-50",
        ].join(" ")}
        aria-hidden="true"
      >
        <span
          className={[
            "w-3/4 rounded-md border p-2 shadow-sm",
            isDark
              ? "border-slate-700 bg-slate-800"
              : "border-slate-200 bg-white",
          ].join(" ")}
        >
          <span
            className={[
              "block h-1.5 w-1/2 rounded-full",
              isDark ? "bg-slate-500" : "bg-slate-300",
            ].join(" ")}
          />
          <span
            className={[
              "mt-1.5 block h-2 rounded-sm",
              isDark ? "bg-slate-700" : "bg-slate-100",
            ].join(" ")}
          />
          <span className="mt-1.5 block h-2 w-1/3 rounded-sm bg-brand" />
        </span>
      </span>
    </button>
  );
};

export default LoginThemeOption;
