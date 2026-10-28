import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "sonner";

import App from "./App";
import AuthSessionSync from "./components/auth/AuthSessionSync";
import AppErrorBoundary from "./components/errors/AppErrorBoundary";
import RuntimeConfigGate from "./components/errors/RuntimeConfigGate";
import DirtyWorkRouteGuard from "./components/common/DirtyWorkRouteGuard";
import { configureSessionStore } from "./services/sessionService";
import { store } from "./store/store";
import { applyStoredAppTheme } from "./utils/sidebarTheme";

import "./index.css";

applyStoredAppTheme();
configureSessionStore(store);

const router = createBrowserRouter([{ path: "*", element: <><DirtyWorkRouteGuard /><AuthSessionSync /><App /><Toaster position="top-right" richColors /></> }]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppErrorBoundary>
        <RuntimeConfigGate>
          <RouterProvider router={router} />
        </RuntimeConfigGate>
      </AppErrorBoundary>
    </Provider>
  </React.StrictMode>,
);
