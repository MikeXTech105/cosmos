const AppInput = ({
  className = "",
  error,
  id,
  label,
  required,
  type = "text",
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-[13px] font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={[
          "h-11 w-full rounded-xl border bg-white/80 px-4 text-sm text-slate-800 placeholder:text-slate-400",
          "outline-none transition-all",
          "focus:bg-white focus:ring-2 focus:ring-brand/25 focus:border-brand",
          error
            ? "border-red-400 bg-red-50/50"
            : "border-slate-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && (
        <p className="text-[12px] text-red-500">{error}</p>
      )}
    </div>
  );
};

export default AppInput;
