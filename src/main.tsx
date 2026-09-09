import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { startVisitorAnalytics } from "./lib/analytics";
import "./index.css";

// Amplitude em modo vitrine para quem não está logado: sem cookie, sem IP, sem replay.
// O modo produto (autocapture + session replay) só liga depois do login, em
// AuthContext → startProductAnalytics (PUL-239, ADR-0030).
startVisitorAnalytics();

if (window.matchMedia('(max-width: 767px)').matches && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById("root")!).render(<App />);
