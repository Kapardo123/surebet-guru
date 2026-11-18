import { createRoot } from "react-dom/client";
import { applyTable, getTable } from "@/lib/theme";
import { track } from "@/lib/analytics";
import { ErrorBoundary, initMonitoring } from "@/lib/monitoring";
import App from "./App.tsx";
import "./index.css";

initMonitoring();
applyTable(getTable());
track("app_open", { version: __APP_VERSION__ });
const Crashed = () => (
  <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "#f6f2e8", background: "#0e1120", fontFamily: "Rubik, sans-serif" }}>
    <div>
      <p style={{ fontWeight: 900, fontSize: 22 }}>Something went wrong</p>
      <p style={{ opacity: 0.7, marginTop: 8 }}>The error has been reported. Reload to try again.</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 20, height: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#ffd23f", fontWeight: 700 }}>
        Reload
      </button>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallback={<Crashed />}>
    <App />
  </ErrorBoundary>,
);
