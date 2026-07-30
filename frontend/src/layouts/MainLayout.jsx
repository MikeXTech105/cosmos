import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import useDocumentTitle from "../hooks/useDocumentTitle";

const MainLayout = () => {
  useDocumentTitle();
  const location = useLocation();
  const mainRef = useRef(null);
  const previousLocationRef = useRef(null);

  useEffect(() => {
    const routeKey = `${location.pathname}${location.search}`;

    if (
      previousLocationRef.current === null ||
      previousLocationRef.current === routeKey
    ) {
      previousLocationRef.current = routeKey;
      return undefined;
    }

    previousLocationRef.current = routeKey;
    let focused = false;
    const focusRouteTarget = () => {
      const heading = mainRef.current?.querySelector("h1");

      if (!(heading instanceof HTMLElement)) {
        return false;
      }

      if (!heading.hasAttribute("tabindex")) {
        heading.setAttribute("tabindex", "-1");
      }
      heading.focus({ preventScroll: true });
      focused = true;
      return true;
    };
    const frameId = window.requestAnimationFrame(focusRouteTarget);
    const observer = new MutationObserver(() => {
      if (focusRouteTarget()) {
        observer.disconnect();
      }
    });
    observer.observe(mainRef.current, { childList: true, subtree: true });
    const timeoutId = window.setTimeout(() => {
      observer.disconnect();

      if (!focused) {
        mainRef.current?.focus({ preventScroll: true });
      }
    }, 1200);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [location.pathname, location.search]);

  return (
    <div className="flex h-dvh flex-col bg-slate-50 text-slate-950 lg:flex-row">
      <a
        href="#main"
        className="sr-only fixed left-3 top-3 z-[200] rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl focus:not-sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        Skip to main content
      </a>
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main
          ref={mainRef}
          id="main"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto outline-none"
        >
          <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
