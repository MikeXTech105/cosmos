import { motion } from "framer-motion";
import { Outlet } from "react-router-dom";

import FloatingIcons from "../components/auth/FloatingIcons";
import CosmosBrand from "../components/branding/CosmosBrand";
import { AUTH_FEATURES, AUTH_STATS } from "../constants/authConstants";
import useAuthTheme from "../hooks/useAuthTheme";
import { AUTH_THEME } from "../utils/authTheme";

const getAuthLayoutClasses = (authTheme) => {
  const isDark = authTheme === AUTH_THEME.DARK;

  return {
    brandPanel: isDark
      ? "border-r border-white/[0.06] bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900"
      : "border-r border-white/10 bg-gradient-to-br from-brand via-indigo-700 to-brand-dark",
    brandTile: isDark
      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
      : "bg-white/15 text-white shadow-lg shadow-indigo-950/20 ring-1 ring-white/20",
    card: isDark
      ? "border border-white/[0.07] bg-slate-950/90 shadow-2xl shadow-black/60 backdrop-blur-2xl"
      : "border border-slate-200 bg-white shadow-2xl shadow-indigo-950/10",
    featureIcon: isDark
      ? "border-blue-500/25 bg-blue-600/20 text-blue-400"
      : "border-white/20 bg-white/15 text-white",
    featureText: isDark ? "text-slate-400" : "text-indigo-50",
    footer: isDark ? "text-slate-700" : "text-slate-400",
    grid: isDark
      ? "opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)]"
      : "opacity-40 bg-[linear-gradient(rgba(79,70,229,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.14)_1px,transparent_1px)]",
    halo: isDark
      ? "bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_65%)]"
      : "bg-[radial-gradient(circle,rgba(79,70,229,0.18)_0%,transparent_65%)]",
    panelGlow: isDark
      ? "bg-[radial-gradient(ellipse_at_30%_20%,rgba(59,130,246,0.08)_0%,transparent_60%)]"
      : "bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.18)_0%,transparent_60%)]",
    root: isDark
      ? "bg-slate-950"
      : "bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-100",
    stat: isDark
      ? "border border-white/[0.07] bg-white/[0.02]"
      : "border border-white/15 bg-white/10",
    statLabel: isDark ? "text-slate-500" : "text-indigo-100/75",
    subtitle: isDark ? "text-slate-500" : "text-indigo-100/80",
    titleAccent: isDark ? "text-slate-400" : "text-indigo-100",
  };
};

const AuthLayout = () => {
  const { authTheme } = useAuthTheme();
  const classes = getAuthLayoutClasses(authTheme);

  return (
    <div
      className={[
        "relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-14 sm:py-10",
        classes.root,
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 [background-size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]",
          classes.grid,
        ].join(" ")}
      />

      <motion.div
        className={[
          "pointer-events-none absolute left-1/2 top-[-250px] h-[900px] w-[900px] -translate-x-1/2 rounded-full blur-[60px]",
          classes.halo,
        ].join(" ")}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <FloatingIcons theme={authTheme} />

      <motion.div
        initial={{
          opacity: 0,
          y: 28,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={[
          "relative z-10 grid w-full max-w-5xl overflow-hidden rounded-2xl lg:grid-cols-[1.1fr_1fr]",
          classes.card,
        ].join(" ")}
      >
        <div
          className={[
            "relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between",
            classes.brandPanel,
          ].join(" ")}
        >
          <div
            className={[
              "pointer-events-none absolute left-0 top-0 h-full w-full",
              classes.panelGlow,
            ].join(" ")}
          />

          <div className="relative z-10 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center"
            >
              <CosmosBrand
                accentClassName="text-indigo-200"
                className="scale-110"
                subtitleClassName={classes.subtitle}
                titleClassName="text-white"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <h1 className="text-3xl font-bold leading-[1.2] tracking-tight text-white">
                Manage your platform
                <br />
                <span className={["font-semibold", classes.titleAccent].join(" ")}>
                  with confidence.
                </span>
              </h1>

              <p
                className={[
                  "mt-4 text-sm leading-relaxed",
                  classes.featureText,
                ].join(" ")}
              >
                A single, focused console for operations, analytics, approvals,
                and team access.
              </p>
            </motion.div>

            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              {AUTH_FEATURES.map(({ icon: Icon, text }, index) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.07 }}
                  className="flex items-center gap-2.5"
                >
                  <div
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      classes.featureIcon,
                    ].join(" ")}
                  >
                    <Icon className="h-3 w-3" />
                  </div>

                  <span className={["text-sm", classes.featureText].join(" ")}>
                    {text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="relative z-10 mt-10 grid grid-cols-3 gap-2.5"
          >
            {AUTH_STATS.map(({ value, label }) => (
              <div key={label} className={["rounded-xl p-3.5", classes.stat].join(" ")}>
                <p className="text-xl font-bold text-white">{value}</p>

                <p
                  className={[
                    "mt-0.5 text-[10px] uppercase tracking-wider",
                    classes.statLabel,
                  ].join(" ")}
                >
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <Outlet />
        </div>
      </motion.div>

      <p
        className={[
          "absolute bottom-4 left-0 right-0 z-10 text-center text-[10px] tracking-wider",
          classes.footer,
        ].join(" ")}
      >
        © 2026 COSMOS · A WEWEL PRODUCT / Privacy / Terms
      </p>
    </div>
  );
};

export default AuthLayout;
