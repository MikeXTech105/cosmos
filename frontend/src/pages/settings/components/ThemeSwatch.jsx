import { Check } from "lucide-react";

const ThemeSwatch = ({ isSelected, onSelect, theme }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`Use ${theme.name} accent theme`}
      className={[
        "group relative overflow-hidden rounded-xl border-2 bg-white text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-2",
        isSelected
          ? `${theme.preview.border} ${theme.preview.shadow} -translate-y-px shadow-lg`
          : "border-slate-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-sm",
      ].join(" ")}
      onClick={() => onSelect(theme.id)}
    >
      {isSelected && (
        <span
          className={[
            "absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white",
            theme.preview.accent,
          ].join(" ")}
          aria-hidden="true"
        >
          <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
        </span>
      )}

      <div className="p-1.5 pb-0">
        <div className="grid h-20 grid-cols-[32%_1fr] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner">
          <div className={["flex flex-col p-1.5", theme.preview.root].join(" ")}>
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
            <div className="mt-auto space-y-1">
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
            </div>
          </div>

          <div className="flex flex-col bg-slate-50 p-2">
            <span className="block h-1.5 w-3/4 rounded-full bg-slate-300" />
            <span className="mt-1.5 block h-1 w-full rounded-full bg-slate-200" />
            <span className="mt-1 block h-1 w-2/3 rounded-full bg-slate-200" />
            <div className="mt-auto flex items-center justify-between gap-1.5">
              <span
                className={[
                  "h-3.5 flex-1 rounded",
                  theme.preview.accentLight,
                ].join(" ")}
              />
              <span
                className={["h-3.5 w-7 rounded", theme.preview.button].join(
                  " ",
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 px-2.5 py-2">
        <span
          className={["h-2 w-2 shrink-0 rounded-full", theme.preview.accent].join(
            " ",
          )}
        />
        <span className="truncate text-xs font-medium text-slate-700">
          {theme.name}
        </span>
      </div>
    </button>
  );
};

export default ThemeSwatch;
