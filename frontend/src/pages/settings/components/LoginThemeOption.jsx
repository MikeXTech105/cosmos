const LoginThemeOption = ({ authTheme, onSelect, option }) => {
  const Icon = option.icon;
  const isSelected = authTheme === option.value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      className={[
        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25",
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
};

export default LoginThemeOption;
