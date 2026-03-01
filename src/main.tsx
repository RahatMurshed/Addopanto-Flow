import "./lib/sentry"; // must be first import
import { createRoot } from "react-dom/client";
import { Sentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Global catch-all for unhandled async errors
window.addEventListener("unhandledrejection", (event) => {
  Sentry.captureException(event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
