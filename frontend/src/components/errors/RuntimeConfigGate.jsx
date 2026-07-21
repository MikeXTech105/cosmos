import runtimeConfig from "../../config/runtimeConfig";

const RuntimeConfigGate = ({ children }) => {
  if (!runtimeConfig.error) return children;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-5 py-10 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-red-800/70 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-red-300">
          COSMOS ERP configuration
        </p>
        <h1 className="mt-3 text-2xl font-semibold">API configuration is invalid</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-slate-300">
          {runtimeConfig.error}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Set API_BASE_URL to an HTTP(S) URL, a leading-slash same-origin path,
          or leave it empty for same-origin requests, then reload the application.
        </p>
      </section>
    </main>
  );
};

export default RuntimeConfigGate;
