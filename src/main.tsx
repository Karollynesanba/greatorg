import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { AppErrorBoundary } from "./app/components/AppErrorBoundary";
import "./index.css";

console.info("[Init] App bootstrap started");

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("[Init] Root element #root was not found");
  throw new Error("Root element #root was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
