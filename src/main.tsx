import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportCrash } from "@/lib/crashReporter";
import { applyCloudKillSwitch } from "@/lib/cloudKillSwitch";

// MUST run before any module touches the supabase client / network so that
// every Lovable Cloud call (db, auth, storage, functions, realtime, raw fetch)
// is neutralized when USE_LOVABLE_CLOUD = false. See src/config/cloudFlag.ts.
applyCloudKillSwitch();

// ---------------------------------------------------------------------------
// Global runtime safety nets
// ---------------------------------------------------------------------------
// App stores reject apps that white-screen on errors. These listeners route
// uncaught issues through the central crash reporter so they include route,
// user, and app-version context — and ship to a sink in production.
window.addEventListener("error", (event) => {
  // Don't spam the console for ResizeObserver errors (browser noise).
  if (event.message?.includes("ResizeObserver loop")) {
    event.stopImmediatePropagation();
    return;
  }
  reportCrash("window-error", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  reportCrash("unhandled-rejection", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
