import { motion } from "framer-motion";

const SIZE_MAP = {
  sm: { ring: 36, dot: 5, text: "text-sm", tagline: "text-[7px]", gap: "gap-2" },
  md: { ring: 60, dot: 7, text: "text-lg", tagline: "text-[8px]", gap: "gap-3" },
  lg: { ring: 84, dot: 9, text: "text-2xl", tagline: "text-[9px]", gap: "gap-4" },
};

const CosmosLoader = ({ className = "", fullScreen = false, label, size = "md" }) => {
  const { dot, gap, ring, tagline, text } = SIZE_MAP[size] ?? SIZE_MAP.md;

  const content = (
    <div className={["flex flex-col items-center justify-center", gap, className].join(" ")}>
      <div className="relative shrink-0" style={{ height: ring, width: ring }}>
        <span className="absolute inset-0 rounded-full border-2 border-brand-light" />
        <span className="absolute inset-[15%] rounded-full border border-brand/15" />
        <motion.span
          animate={{ rotate: 360 }}
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand border-r-brand/40"
          transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
        />
        <motion.span
          animate={{ rotate: -360 }}
          className="absolute inset-0"
          transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
        >
          <span
            className="absolute rounded-full bg-brand shadow-[0_0_10px_var(--color-brand)]"
            style={{
              height: dot,
              left: "50%",
              top: -dot / 2,
              transform: "translateX(-50%)",
              width: dot,
            }}
          />
        </motion.span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span
          className={[
            "font-display font-extrabold tracking-[0.08em] text-slate-950",
            text,
          ].join(" ")}
        >
          COSMOS
        </span>
        <span
          className={[
            "font-semibold uppercase tracking-[0.28em] text-slate-400",
            tagline,
          ].join(" ")}
        >
          by WEWEL
        </span>
      </div>

      {label && <p className="text-xs font-medium text-slate-500">{label}</p>}
    </div>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-slate-50">
      {content}
    </div>
  );
};

export default CosmosLoader;
