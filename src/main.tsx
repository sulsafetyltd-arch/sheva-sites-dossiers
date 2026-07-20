import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateServiceWorker(true);
  },
  onRegisteredSW(_serviceWorkerUrl, registration) {
    if (!registration) return;
    void registration.update();
    window.setInterval(() => void registration.update(), 5 * 60 * 1000);
  },
});

// Public share links (and explicit reset) must not stay stuck on a stale PWA shell.
if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.has("tr") || params.has("ci") || params.has("resetpwa")) {
    void navigator.serviceWorker?.getRegistrations?.().then((regs) => {
      regs.forEach((reg) => void reg.update());
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
