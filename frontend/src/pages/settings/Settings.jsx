import { Check, Moon, Sun } from "lucide-react";

import PageHeader from "../../components/common/PageHeader";
import useAuthTheme from "../../hooks/useAuthTheme";
import { AUTH_THEME } from "../../utils/authTheme";

const AUTH_THEME_OPTIONS = [
  {
    description: "Clean light login screen with white forms and indigo accents.",
    icon: Sun,
    label: "Light",
    value: AUTH_THEME.LIGHT,
  },
  {
    description: "Original dark login screen with deep slate surfaces.",
    icon: Moon,
    label: "Dark",
    value: AUTH_THEME.DARK,
  },
];

const Settings = () => {
  const { authTheme, setAuthTheme } = useAuthTheme();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage client-side preferences for your COSMOS ERP experience."
      />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Appearance
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            Login / Auth Theme
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose the color theme used on public authentication screens.
          </p>
        </div>

        <div className="p-5">
          <div
            className="grid gap-3 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Login theme"
          >
            {AUTH_THEME_OPTIONS.map(({ description, icon: Icon, label, value }) => {
              const isSelected = authTheme === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={[
                    "flex min-h-28 items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                    isSelected
                      ? "border-brand bg-brand-light text-slate-900 ring-2 ring-brand/15"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                  onClick={() => setAuthTheme(value)}
                >
                  <span
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                      isSelected
                        ? "border-brand/20 bg-white text-brand"
                        : "border-slate-200 bg-slate-50 text-slate-500",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{label}</span>
                      {isSelected && <Check className="h-4 w-4 text-brand" />}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">
                      {description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
