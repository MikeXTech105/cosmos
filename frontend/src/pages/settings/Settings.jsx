import { CheckCircle2, Settings2 } from "lucide-react";
import { useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import settingsNav from "./settingsNav";

const SettingsNav = ({ activeSectionId, onSelect }) => {
  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4">
      <div className="border-b border-slate-100 px-4 py-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Settings menu
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          Workspace preferences
        </p>
      </div>

      <nav aria-label="Settings sections" className="p-2">
        <div className="flex min-w-max gap-2 overflow-x-auto pb-1 lg:min-w-0 lg:flex-col lg:overflow-visible lg:pb-0">
          {settingsNav.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSectionId;

            return (
              <button
                key={section.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                className={[
                  "group flex min-w-[190px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 lg:min-w-0 lg:w-full",
                  isActive
                    ? "bg-brand-light text-brand ring-1 ring-inset ring-brand/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
                onClick={() => onSelect(section.id)}
              >
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-white text-brand shadow-sm ring-1 ring-inset ring-brand/10"
                      : "bg-slate-100 text-slate-500 group-hover:bg-white",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {section.label}
                  </span>
                  <span
                    className={[
                      "mt-0.5 block truncate text-[11px]",
                      isActive ? "text-brand/70" : "text-slate-400",
                    ].join(" ")}
                  >
                    {section.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="hidden border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-[11px] text-slate-500 lg:flex lg:items-center lg:gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Preferences save automatically
      </div>
    </aside>
  );
};

const Settings = () => {
  const [activeSectionId, setActiveSectionId] = useState(settingsNav[0].id);
  const activeSection =
    settingsNav.find((section) => section.id === activeSectionId) ?? settingsNav[0];
  const ActiveSection = activeSection.Component;
  const ActiveSectionIcon = activeSection.icon;

  return (
    <section className="min-w-0 space-y-5 pb-4">
      <PageHeader
        badge={
          <>
            <Settings2 className="h-3.5 w-3.5" />
            System / Settings
          </>
        }
        title="Settings"
        description="Personalize how COSMOS ERP looks and prepares business documents."
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <SettingsNav
          activeSectionId={activeSection.id}
          onSelect={setActiveSectionId}
        />

        <main className="min-w-0 space-y-4">
          <header className="flex items-start gap-3 rounded-2xl border border-brand/10 bg-brand-light/40 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm ring-1 ring-inset ring-brand/10">
              <ActiveSectionIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand/70">
                Settings / {activeSection.label}
              </p>
              <h2 className="mt-1 text-base font-bold text-slate-950">
                {activeSection.label}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                {activeSection.description}
              </p>
            </div>
          </header>

          <ActiveSection />
        </main>
      </div>
    </section>
  );
};

export default Settings;
