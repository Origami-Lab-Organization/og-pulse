// `@/types/prospect` importa um TIPO de `@/lib/prospectAttachments`, que puxa o client do
// Vite. O esbuild descarta import de tipo, então nada disso roda aqui — só o tsc enxerga.
interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
