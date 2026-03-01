import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global catch-all for unhandled async errors
window.addEventListener("unhandledrejection", (event) => {
  console.warn("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
