import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ---------------------------------------------------------------------------
// Global runtime safety nets
// ---------------------------------------------------------------------------
// App stores reject apps that white-screen on errors. These listeners log
// uncaught issues so we can surface them later (Sentry/etc.) and avoid
// crashing the whole UI when something async throws far from a boundary.
window.addEventListener("error", (event) => {
  // Don't spam the console for ResizeObserver errors (browser noise).
  if (event.message?.includes("ResizeObserver loop")) {
    event.stopImmediatePropagation();
    return;
  }
  console.error("[window.onerror]", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[unhandledrejection]", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
