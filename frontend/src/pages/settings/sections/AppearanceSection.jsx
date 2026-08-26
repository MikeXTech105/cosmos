import { MonitorCog, Moon, Sun, SwatchBook } from "lucide-react";

import { APP_THEMES } from "../../../config/sidebarThemes";
import useAuthTheme from "../../../hooks/useAuthTheme";
import useSidebarTheme from "../../../hooks/useSidebarTheme";
import { AUTH_THEME } from "../../../utils/authTheme";
import LoginThemeOption from "../components/LoginThemeOption";
import SettingsCard from "../components/SettingsCard";
import ThemeSwatch from "../components/ThemeSwatch";

const AUTH_THEME_OPTIONS = [
  {
    activeIconClassName: "text-amber-500",
    description: "Bright and minimal sign-in experience.",
    icon: Sun,
    label: "Light",
    value: AUTH_THEME.LIGHT,
  },
  {
    activeIconClassName: "text-slate-600",
    description: "Low-glare sign-in for darker environments.",
    icon: Moon,
    label: "Dark",
    value: AUTH_THEME.DARK,
  },
];

const AppearanceSection = () => {
  const { authTheme, setAuthTheme } = useAuthTheme();
  const { setSidebarTheme, sidebarTheme, sidebarThemeId } = useSidebarTheme();
  const selectedAuthTheme = AUTH_THEME_OPTIONS.find((option) => {
    return option.value === authTheme;
  }) ?? AUTH_THEME_OPTIONS[0];
  const SelectedAuthThemeIcon = selectedAuthTheme.icon;

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard
        icon={MonitorCog}
        title="Login screen"
        description="Theme for the public sign-in page."
        action={
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            <SelectedAuthThemeIcon className="h-3.5 w-3.5" />
            {selectedAuthTheme.label}
          </span>
        }
        bodyAriaLabel="Login screen theme"
        bodyClassName="grid gap-3 p-4 sm:grid-cols-2"
        bodyRole="radiogroup"
      >
        {AUTH_THEME_OPTIONS.map((option) => (
          <LoginThemeOption
            key={option.value}
            authTheme={authTheme}
            onSelect={setAuthTheme}
            option={option}
          />
        ))}
      </SettingsCard>

      <SettingsCard
        icon={SwatchBook}
        title="Accent theme"
        description="Applies live to the sidebar and all accent surfaces."
        action={
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
        }
        bodyAriaLabel="Accent theme"
        bodyClassName="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 p-4"
        bodyRole="radiogroup"
      >
        {APP_THEMES.map((theme) => (
          <ThemeSwatch
            key={theme.id}
            theme={theme}
            isSelected={sidebarThemeId === theme.id}
            onSelect={setSidebarTheme}
          />
        ))}
      </SettingsCard>
    </div>
  );
};

export default AppearanceSection;
