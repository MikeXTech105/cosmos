import { AUTH_THEME } from "../../utils/authTheme";

export const getAuthFormClasses = (authTheme) => {
  const isDark = authTheme === AUTH_THEME.DARK;

  return {
    button: isDark
      ? "bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      : "bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60",
    checkbox: isDark
      ? "border-white/20 accent-blue-500"
      : "border-slate-300 accent-brand",
    error: isDark ? "text-red-400" : "text-red-600",
    icon: isDark ? "text-slate-500" : "text-slate-400",
    iconButton: isDark
      ? "text-slate-500 hover:text-blue-400"
      : "text-slate-400 hover:text-brand",
    iconFocus: isDark ? "text-blue-400" : "text-brand",
    input: isDark
      ? "border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-blue-500/15"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand focus:ring-brand/20",
    inputError: isDark
      ? "border-red-500/50"
      : "border-red-300 focus:border-red-500 focus:ring-red-500/10",
    label: isDark ? "text-slate-300" : "text-slate-700",
    link: isDark
      ? "text-blue-400 hover:text-blue-300"
      : "text-brand hover:text-brand-dark",
    subtext: isDark ? "text-slate-400" : "text-slate-500",
    title: isDark ? "text-white" : "text-slate-900",
  };
};
