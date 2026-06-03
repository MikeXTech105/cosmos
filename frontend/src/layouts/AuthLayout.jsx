import { motion } from "framer-motion";
import { Outlet } from "react-router-dom";

import FloatingIcons from "../components/auth/FloatingIcons";
import { AUTH_FEATURES, AUTH_STATS } from "../constants/authConstants";

const AuthLayout = () => {
  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: "#08090d" }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <motion.div
        className="absolute top-[-250px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
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

      <FloatingIcons />

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
        className="relative z-10 w-full max-w-5xl grid overflow-hidden rounded-2xl lg:grid-cols-[1.1fr_1fr]"
        style={{
          background: "rgba(13,14,20,0.9)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between"
          style={{
            background:
              "linear-gradient(160deg,#0f172a 0%,#0d1322 60%,#0a0f1e 100%)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 60%)",
            }}
          />

          <div className="relative z-10 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600"
                style={{
                  boxShadow: "0 0 24px rgba(59,130,246,0.4)",
                }}
              >
                <span className="text-lg font-bold text-white">C</span>
              </div>

              <div>
                <p className="text-base font-bold leading-tight tracking-tight text-white">
                  COSMOS ERP
                </p>

                <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Enterprise Suite
                </p>
              </div>
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
                <span className="font-semibold text-slate-400">
                  with confidence.
                </span>
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-slate-400">
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
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-blue-500/25 bg-blue-600/20">
                    <Icon className="h-3 w-3 text-blue-400" />
                  </div>

                  <span className="text-sm text-slate-400">{text}</span>
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
              <div
                key={label}
                className="rounded-xl p-3.5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="text-xl font-bold text-white">{value}</p>

                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex flex-col justify-center px-8 py-10 lg:px-10">
          <Outlet />
        </div>
      </motion.div>

      <p className="absolute bottom-4 left-0 right-0 z-10 text-center text-[10px] tracking-wider text-slate-700">
        (c) 2026 COSMOS ERP / Privacy / Terms
      </p>
    </div>
  );
};

export default AuthLayout;
