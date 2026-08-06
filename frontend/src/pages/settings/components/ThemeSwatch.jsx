import { Check } from "lucide-react";

const ThemeSwatch = ({ isSelected, onSelect, theme }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`Use ${theme.name} accent theme`}
      className={[
        "group rounded-xl border bg-white p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-2",
        isSelected
          ? "border-brand shadow-sm ring-1 ring-inset ring-brand/10"
          : "border-slate-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-sm",
      ].join(" ")}
      onClick={() => onSelect(theme.id)}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "h-2.5 w-2.5 shrink-0 rounded-full",
              theme.preview.accent,
            ].join(" ")}
          />
          <span className="truncate text-xs font-semibold text-slate-700">
            {theme.name}
          </span>
        </span>
        <span
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            isSelected
              ? "border-brand bg-brand text-white"
              : "border-slate-200 bg-slate-50 text-transparent",
          ].join(" ")}
          aria-hidden="true"
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </span>

      <span className="mt-2.5 grid h-20 grid-cols-[34%_1fr] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner">
        <span className={["flex flex-col p-2", theme.preview.root].join(" ")}>
          <span
            className={["h-1 w-full rounded-full", theme.preview.accent].join(
              " ",
            )}
          />
          <span
            className={[
              "mt-2 h-2 w-2 rounded-sm",
              theme.preview.accent,
            ].join(" ")}
          />
          <span className="mt-auto space-y-1">
            <span
              className={[
                "block h-1 w-full rounded-full",
                theme.preview.sidebarText,
              ].join(" ")}
            />
            <span
              className={[
                "block h-1 w-3/4 rounded-full opacity-75",
                theme.preview.sidebarText,
              ].join(" ")}
            />
          </span>
        </span>

        <span className="flex flex-col bg-slate-50 p-2.5">
          <span className="block h-1.5 w-3/4 rounded-full bg-slate-300" />
          <span className="mt-1.5 block h-1 w-full rounded-full bg-slate-200" />
          <span className="mt-1 block h-1 w-2/3 rounded-full bg-slate-200" />
          <span className="mt-auto flex items-center justify-between gap-1.5">
            <span
              className={[
                "h-3.5 flex-1 rounded",
                theme.preview.accentLight,
              ].join(" ")}
            />
            <span
              className={["h-3.5 w-7 rounded", theme.preview.button].join(" ")}
            />
          </span>
        </span>
      </span>
    </button>
  );
};

export default ThemeSwatch;
