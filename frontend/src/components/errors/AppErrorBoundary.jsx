import { Component, createRef } from "react";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.headingRef = createRef();
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("COSMOS ERP render failure", error, info);
  }

  componentDidUpdate(previousProps, previousState) {
    if (!previousState.error && this.state.error) {
      this.headingRef.current?.focus();
    }
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-5 py-10 text-slate-100">
        <section className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
            COSMOS ERP
          </p>
          <h1
            ref={this.headingRef}
            tabIndex={-1}
            className="mt-3 text-2xl font-semibold outline-none sm:text-3xl"
          >
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The application could not render this screen. Reload it, or return
            to your authorized app home.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mid"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-600 px-5 text-sm font-semibold text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Go to app home
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-6 rounded-xl bg-slate-950 p-4 text-xs text-slate-300">
              <summary className="cursor-pointer font-semibold">
                Technical details
              </summary>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words">
                {error.stack ?? error.message}
              </pre>
            </details>
          )}
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
