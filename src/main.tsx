import { createRoot } from "react-dom/client";
import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";
import App from "./App.tsx";
import "./index.css";

amplitude.add(sessionReplayPlugin({ sampleRate: 1 }));
amplitude.init("62311ec50b18fbe85ef567acf268171c", { autocapture: true });

createRoot(document.getElementById("root")!).render(<App />);
