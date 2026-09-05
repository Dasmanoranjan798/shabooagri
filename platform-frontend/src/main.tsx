import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted Inter (variable) — no external font requests (CSP/GDPR-safe),
// bundled with the app. The professional UI typeface for the whole platform.
import "@fontsource-variable/inter";
import "./index.css";
import { App } from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
