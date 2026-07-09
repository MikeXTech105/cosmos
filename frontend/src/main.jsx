import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "sonner";

import App from "./App";
import { store } from "./store/store";
import { applyStoredAppTheme } from "./utils/sidebarTheme";

import "./index.css";

applyStoredAppTheme();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />

        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
