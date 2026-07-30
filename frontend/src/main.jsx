import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "sonner";

import App from "./App";
import AuthSessionSync from "./components/auth/AuthSessionSync";
import AppErrorBoundary from "./components/errors/AppErrorBoundary";
import RuntimeConfigGate from "./components/errors/RuntimeConfigGate";
import { configureSessionStore } from "./services/sessionService";
import { store } from "./store/store";
import { applyStoredAppTheme } from "./utils/sidebarTheme";

import "./index.css";

applyStoredAppTheme();
configureSessionStore(store);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppErrorBoundary>
        <RuntimeConfigGate>
          <BrowserRouter>
            <AuthSessionSync />
            <App />

            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </RuntimeConfigGate>
      </AppErrorBoundary>
    </Provider>
  </React.StrictMode>,
);
