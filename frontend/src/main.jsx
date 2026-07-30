import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import App from "./App";
import AuthSessionSync from "./components/auth/AuthSessionSync";
import AccessibleToaster from "./components/common/AccessibleToaster";
import AppErrorBoundary from "./components/errors/AppErrorBoundary";
import RuntimeConfigGate from "./components/errors/RuntimeConfigGate";
import { configureSessionStore } from "./services/sessionService";
import { store } from "./store/store";
import { applyStoredAppTheme } from "./utils/sidebarTheme";

import "./index.css";

applyStoredAppTheme();
configureSessionStore(store);

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <AppErrorBoundary>
        <RuntimeConfigGate>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <AuthSessionSync />
              <App />

              <AccessibleToaster position="top-right" richColors />
            </BrowserRouter>
          </MotionConfig>
        </RuntimeConfigGate>
      </AppErrorBoundary>
    </Provider>
  </React.StrictMode>,
);

if (import.meta.env.DEV) {
  window.setTimeout(() => {
    void import("@axe-core/react").then(({ default: axe }) => {
      axe(React, ReactDOM, 1000);
    });
  }, 3000);
}
