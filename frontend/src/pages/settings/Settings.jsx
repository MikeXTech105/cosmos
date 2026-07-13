import {
  Bell,
  Check,
  FileText,
  Languages,
  MonitorCog,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  SwatchBook,
} from "lucide-react";
import { useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import { APP_THEMES } from "../../config/sidebarThemes";
import useAuthTheme from "../../hooks/useAuthTheme";
import useSidebarTheme from "../../hooks/useSidebarTheme";
import { AUTH_THEME } from "../../utils/authTheme";
import { invoiceTemplates } from "../sales/invoiceTemplates/templateRegistry";
import {
  getStoredInvoiceTemplate,
  setStoredInvoiceTemplate,
} from "../sales/invoiceTemplates/templateStorage";

const AUTH_THEME_OPTIONS = [
  {
    activeIconClassName: "text-amber-500",
    icon: Sun,
    label: "Light",
    value: AUTH_THEME.LIGHT,
  },
  {
    activeIconClassName: "text-indigo-500",
    icon: Moon,
    label: "Dark",
    value: AUTH_THEME.DARK,
  },
];

const SETTINGS_SECTIONS = [
  {
    description: "Login and app-wide visual preferences.",
    icon: Palette,
    id: "appearance",
    label: "Appearance",
  },
  {
    description: "Notification preferences are coming soon.",
    icon: Bell,
    id: "notifications",
    label: "Notifications",
  },
  {
    description: "Language preferences are coming soon.",
    icon: Languages,
    id: "language",
    label: "Language",
  },
  {
    description: "Security preferences are coming soon.",
    icon: ShieldCheck,
    id: "security",
    label: "Security",
  },
  {
    description: "Defaults for generated business documents.",
    icon: FileText,
    id: "documents",
    label: "Documents",
  },
];

const SettingsNav = ({ activeSectionId, onSelect }) => {
  return (
    <nav aria-label="Settings sections" className="min-w-0">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
        <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSectionId;

            return (
              <button
                key={section.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex items-center gap-2.5 whitespace-nowrap rounded-xl border px-3 py-2.5 text-left text-sm transition-colors lg:w-full",
                  isActive
                    ? "border-slate-200 bg-white font-semibold text-brand shadow-sm"
                    : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                ].join(" ")}
                onClick={() => onSelect(section.id)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

const HeaderIdentity = ({ description, icon: Icon, title, variant = "brand" }) => {
  const iconClassName =
    variant === "indigo"
      ? "bg-gradient-to-br from-indigo-50 via-white to-indigo-100 text-indigo-600 ring-indigo-100"
      : "bg-gradient-to-br from-brand-light via-white to-brand-mid/30 text-brand ring-brand/10";

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset",
          iconClassName,
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
};

const LoginThemeToggle = ({ authTheme, onSelect }) => {
  return (
    <div
      className="inline-flex shrink-0 gap-0.5 rounded-xl bg-slate-100 p-0.5"
      role="radiogroup"
      aria-label="Login screen theme"
    >
      {AUTH_THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = authTheme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition-all",
              isSelected
                ? "bg-white font-semibold text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
            onClick={() => onSelect(option.value)}
          >
            <Icon
              className={[
                "h-4 w-4",
                isSelected ? option.activeIconClassName : "text-slate-400",
              ].join(" ")}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

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
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}

      <div className="p-1.5 pb-0">
        <div className="grid h-20 grid-cols-[32%_1fr] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner">
          <div
            className={[
              "flex flex-col p-1.5",
              theme.preview.root,
            ].join(" ")}
          >
            <span
              className={[
                "h-1 w-full rounded-full",
                theme.preview.accent,
              ].join(" ")}
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
                className={[
                  "h-3.5 w-7 rounded",
                  theme.preview.button,
                ].join(" ")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 px-2.5 py-2">
        <span
          className={[
            "h-2 w-2 shrink-0 rounded-full",
            theme.preview.accent,
          ].join(" ")}
        />
        <span className="truncate text-xs font-medium text-slate-700">
          {theme.name}
        </span>
      </div>
    </button>
  );
};

const AppearancePanel = ({ authTheme, onAuthThemeSelect, sidebarTheme, sidebarThemeId, onSidebarThemeSelect }) => {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <HeaderIdentity
            icon={MonitorCog}
            title="Login Screen"
            description="Theme for the public sign-in page."
            variant="indigo"
          />
          <LoginThemeToggle authTheme={authTheme} onSelect={onAuthThemeSelect} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <HeaderIdentity
            icon={SwatchBook}
            title="Accent Theme"
            description="Applies live to the sidebar and all accent surfaces."
          />

          <span
            className={[
              "inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-brand/10",
              sidebarTheme.preview.accentLight,
              sidebarTheme.accent.textClassName,
            ].join(" ")}
            aria-live="polite"
          >
            <span
              className={[
                "h-2 w-2 rounded-full",
                sidebarTheme.preview.accent,
              ].join(" ")}
            />
            {sidebarTheme.name}
          </span>
        </div>

        <div
          className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-6"
          role="radiogroup"
          aria-label="Accent theme"
        >
          {APP_THEMES.map((theme) => (
            <ThemeSwatch
              key={theme.id}
              theme={theme}
              isSelected={sidebarThemeId === theme.id}
              onSelect={onSidebarThemeSelect}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

const InvoiceTemplateOption = ({ isSelected, onSelect, template }) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={[
        "overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition-all",
        isSelected
          ? "border-brand shadow-md shadow-brand/10"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md",
      ].join(" ")}
      onClick={() => onSelect(template.id)}
    >
      <div className="p-3">
        <div
          className={[
            "h-36 rounded-xl border-2 p-3",
            template.thumbnailClass,
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="block h-2 w-16 rounded-full bg-slate-900" />
              <span className="block h-2 w-24 rounded-full bg-slate-300" />
              <span className="block h-2 w-20 rounded-full bg-slate-200" />
            </div>
            <span className="block h-8 w-14 rounded-lg bg-brand" />
          </div>
          <div className="mt-5 space-y-2">
            <span className="block h-2 rounded-full bg-slate-200" />
            <span className="block h-2 rounded-full bg-slate-200" />
            <span className="block h-2 w-2/3 rounded-full bg-slate-200" />
          </div>
          <div className="mt-5 ml-auto space-y-2">
            <span className="block h-2 w-24 rounded-full bg-slate-300" />
            <span className="block h-3 w-28 rounded-full bg-slate-900" />
          </div>
        </div>
      </div>

      <div
        className={[
          "flex items-start justify-between gap-3 border-t px-4 py-3",
          isSelected
            ? "border-brand/10 bg-brand-light"
            : "border-slate-100 bg-slate-50",
        ].join(" ")}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {template.name}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {template.description}
          </span>
        </span>
        {isSelected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </button>
  );
};

const DocumentsPanel = ({ invoiceTemplateId, onSelect }) => {
  const selectedTemplate = invoiceTemplates.find((template) => {
    return template.id === invoiceTemplateId;
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <HeaderIdentity
          icon={FileText}
          title="Invoice Template"
          description="Sets the default template for sale invoice preview and PDF downloads."
        />
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/10">
          <Check className="h-3.5 w-3.5" />
          {selectedTemplate?.name ?? "Classic"}
        </span>
      </div>

      <div
        className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5"
        role="radiogroup"
        aria-label="Default invoice template"
      >
        {invoiceTemplates.map((template) => (
          <InvoiceTemplateOption
            key={template.id}
            template={template}
            isSelected={invoiceTemplateId === template.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
};

const ComingSoonPanel = ({ section }) => {
  const Icon = section.icon;

  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light via-white to-brand-mid/30 text-brand shadow-sm ring-1 ring-inset ring-brand/10">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">
        {section.label}
      </h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        {section.description}
      </p>
      <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
        Coming soon
      </span>
    </section>
  );
};

const Settings = () => {
  const { authTheme, setAuthTheme } = useAuthTheme();
  const { setSidebarTheme, sidebarTheme, sidebarThemeId } = useSidebarTheme();
  const [activeSectionId, setActiveSectionId] = useState("appearance");
  const [invoiceTemplateId, setInvoiceTemplateId] = useState(
    getStoredInvoiceTemplate,
  );

  const activeSection =
    SETTINGS_SECTIONS.find((section) => section.id === activeSectionId) ??
    SETTINGS_SECTIONS[0];

  const selectInvoiceTemplate = (templateId) => {
    setInvoiceTemplateId(templateId);
    setStoredInvoiceTemplate(templateId);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage client-side preferences for your COSMOS ERP experience."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
        <SettingsNav
          activeSectionId={activeSection.id}
          onSelect={setActiveSectionId}
        />

        <div className="min-w-0">
          {activeSection.id === "appearance" && (
            <AppearancePanel
              authTheme={authTheme}
              onAuthThemeSelect={setAuthTheme}
              sidebarTheme={sidebarTheme}
              sidebarThemeId={sidebarThemeId}
              onSidebarThemeSelect={setSidebarTheme}
            />
          )}

          {activeSection.id === "documents" && (
            <DocumentsPanel
              invoiceTemplateId={invoiceTemplateId}
              onSelect={selectInvoiceTemplate}
            />
          )}

          {activeSection.id !== "appearance" &&
            activeSection.id !== "documents" && (
              <ComingSoonPanel section={activeSection} />
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
