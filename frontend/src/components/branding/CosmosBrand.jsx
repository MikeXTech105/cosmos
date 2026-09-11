const CosmosBrand = ({
  accentClassName = "text-brand",
  className = "",
  subtitle = "A WEWEL PRODUCT",
  subtitleClassName = "text-slate-400",
  titleClassName = "text-slate-950",
}) => {
  return (
    <div
      aria-label={`COSMOS — ${subtitle}`}
      className={["flex min-w-0 select-none flex-col items-center text-center", className].join(" ")}
      role="img"
    >
      <div aria-hidden="true" className="flex items-center leading-none">
        <span
          className={[
            "font-display text-[22px] font-extrabold tracking-[0.075em]",
            titleClassName,
          ].join(" ")}
        >
          COSM
        </span>
        <span
          className={[
            "relative ml-0.5 mr-1 h-5 w-5 shrink-0",
            accentClassName,
          ].join(" ")}
        >
          <span className="absolute inset-[2px] rounded-full border-2 border-current" />
          <span className="absolute -inset-x-0.5 top-1/2 h-[8px] -translate-y-1/2 rotate-[-18deg] rounded-[50%] border border-current opacity-60" />
          <span className="absolute right-[-1px] top-[1px] h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_7px_currentColor]" />
        </span>
        <span
          className={[
            "font-display text-[22px] font-extrabold tracking-[0.075em]",
            titleClassName,
          ].join(" ")}
        >
          S
        </span>
      </div>

      <div aria-hidden="true" className="mt-1.5 flex items-center justify-center gap-1.5">
        <span className={["h-px w-5 bg-current opacity-60", accentClassName].join(" ")} />
        <span
          className={[
            "whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.2em]",
            subtitleClassName,
          ].join(" ")}
        >
          {subtitle}
        </span>
        <span className={["h-px w-5 bg-current opacity-60", accentClassName].join(" ")} />
      </div>
    </div>
  );
};

export default CosmosBrand;
