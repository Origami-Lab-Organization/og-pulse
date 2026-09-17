import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Serve `app.html` para as rotas do produto no `npm run dev`.
 *
 * Em produção quem faz isso é o rewrite da Vercel. O dev server não lê `vercel.json`, e sem
 * este plugin o fallback do Vite entrega `index.html` — o bundle da VITRINE, cujo roteador
 * só conhece home, guias e páginas legais. Resultado: abrir `/login` direto, dar F5 em
 * qualquer tela ou clicar num link salvo caía no 404 do site público, embora a rota exista.
 *
 * A lista de segmentos sai do próprio `vercel.json` de propósito: é a mesma que
 * `scripts/check-app-routes.mjs` cobra no build, então dev e produção não têm como divergir.
 */
function serveAppShellEmDev(): Plugin {
  return {
    name: "pulse-app-shell-dev",
    apply: "serve",
    configureServer(server) {
      const segmentos = segmentosDoAppShell();
      server.middlewares.use((req, _res, next) => {
        // Só navegação: requisição de módulo, imagem ou HMR passa direto.
        if (!req.headers.accept?.includes("text/html")) return next();
        const primeiro = (req.url ?? "").split("?")[0].split("/")[1];
        if (primeiro && segmentos.has(primeiro)) req.url = "/app.html";
        next();
      });
    },
  };
}

/**
 * Páginas da vitrine que também aparecem na lista de rewrites. Em produção elas não chegam
 * ao rewrite: o build pré-renderiza `dist/termos/index.html` e afins, e arquivo estático
 * ganha do rewrite na Vercel. Em dev não existe pré-renderizado, então a exceção é aqui —
 * senão uma página de marketing abriria pelo bundle do produto, que é o que a ADR-0035
 * saiu resolvendo.
 */
const ROTAS_DA_VITRINE = new Set(["termos", "privacidade", "guias"]);

/** Os segmentos que o `vercel.json` manda para `/app.html`, lidos do arquivo. */
function segmentosDoAppShell(): Set<string> {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  const listas: string[] = (config.rewrites ?? [])
    .filter((regra: { destination?: string }) => regra.destination === "/app.html")
    .map((regra: { source: string }) => regra.source.match(/^\/:segment\(([^)]+)\)/)?.[1])
    .filter(Boolean);
  const segmentos = listas.flatMap((lista) => lista.split("|"));
  return new Set(segmentos.filter((segmento) => !ROTAS_DA_VITRINE.has(segmento)));
}

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
    !isPrerender && serveAppShellEmDev(),
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
