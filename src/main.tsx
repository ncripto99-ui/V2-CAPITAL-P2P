// ✅ Patch global para crypto.randomUUID (móvil / HTTP por IP)
// En algunos navegadores, randomUUID solo existe en "secure context" (https o localhost).
(() => {
  const c: any = globalThis.crypto;
  if (!c) return;

  if (typeof c.randomUUID !== "function") {
    c.randomUUID = () =>
      `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
        .toString(16)
        .slice(2)}`;
  }
})();

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import { DataProvider } from "./context/DataContext";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </ThemeProvider>
  </StrictMode>
);
