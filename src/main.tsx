import { createRoot } from "react-dom/client";
import { applyTable, getTable } from "@/lib/theme";
import App from "./App.tsx";
import "./index.css";

applyTable(getTable());
createRoot(document.getElementById("root")!).render(<App />);
