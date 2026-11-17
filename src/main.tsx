import React from "react";
import ReactDOM from "react-dom/client";

import "./styles/globals.css";
import { AppProviders } from "@/app/providers";
import { App } from "@/app/App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
