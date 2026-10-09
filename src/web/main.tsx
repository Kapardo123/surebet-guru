import { createRoot } from "react-dom/client";
import "@/index.css";
import "./web.css";
import WebApp from "./WebApp";

createRoot(document.getElementById("root")!).render(<WebApp />);
