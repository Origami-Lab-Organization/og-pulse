import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Modo "prerender": build SSR da landing por scripts/prerender-landing.mjs.
  // Sem PWA nem tagger, e sem as entradas HTML (a entrada vem de --ssr).
  const isPrerender = mode === "prerender";
  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    !isPrerender && mode === "development" && componentTagger(),
    !isPrerender && VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      registerType: "autoUpdate",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "Origami Pulse",
        short_name: "Pulse",
        description: "Timesheet e tarefas da Origami Lab",
        start_url: "/my-timesheet",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    rollupOptions: isPrerender
      ? {}
      : {
          input: {
            // Home pública, pré-renderizada no build (scripts/prerender-landing.mjs).
            main: path.resolve(__dirname, "index.html"),
            // Shell da área logada (noindex): a Vercel serve para toda rota que não é a home.
            app: path.resolve(__dirname, "app.html"),
            // Entry separado: carregar a SPA na página de retorno faria o roteador
            // apagar o fragmento com o código do OAuth.
            microsoftAuth: path.resolve(__dirname, "microsoft-auth.html"),
          },
        },
  },
  };
});
