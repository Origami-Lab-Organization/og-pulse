/**
 * Se o Pulse está mesmo online (23/11/2026).
 *
 * O `navigator.onLine` dá "offline" falso — VPN, troca de rede, o Mac voltando do repouso, o
 * modo offline esquecido nas ferramentas do navegador — e a faixa "Você está offline" aparecia
 * para quem estava conectado. Agora o "offline" do navegador só vale depois de conferido: uma
 * chamada leve ao endereço de saúde da autenticação do Supabase (fora do cache do service
 * worker, que só guarda leituras de tabela com login). Qualquer resposta, mesmo de erro, é
 * conexão; só a falha de rede é offline. Enquanto offline, confere de novo a cada 15 s.
 *
 * Um estado só para todas as telas (faixa, timesheet, Meu Kanban), assinado por
 * `usePwaEnvironment`.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PRAZO_DA_CONFERENCIA_MS = 5_000;
const INTERVALO_OFFLINE_MS = 15_000;

// Começa online: o "offline" do navegador espera a conferência, que falha na hora quando não há
// rede de verdade (a faixa aparece logo) e evita o aviso falso piscando quando há.
let online = true;
let iniciado = false;
let proxima: ReturnType<typeof setTimeout> | undefined;
const ouvintes = new Set<() => void>();

function definir(valor: boolean) {
  if (online === valor) return;
  online = valor;
  ouvintes.forEach((avisar) => avisar());
}

/** Responde qualquer coisa: há conexão. Falha de rede ou prazo estourado: não há. */
async function responde(): Promise<boolean> {
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), PRAZO_DA_CONFERENCIA_MS);
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/health`, { cache: 'no-store', headers: { apikey: CHAVE_PUBLICA }, signal: controle.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(prazo);
  }
}

async function conferir() {
  clearTimeout(proxima);
  const conectado = await responde();
  definir(conectado);
  if (!conectado) proxima = setTimeout(conferir, INTERVALO_OFFLINE_MS);
}

function voltouAConexao() {
  clearTimeout(proxima);
  definir(true);
}

function iniciar() {
  iniciado = true;
  window.addEventListener('online', voltouAConexao);
  window.addEventListener('offline', () => void conferir());
  if (!navigator.onLine) void conferir();
}

/** Assina as mudanças; a primeira assinatura liga a escuta. */
export function assinarConectividade(avisar: () => void): () => void {
  if (!iniciado) iniciar();
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

export const estaOnline = (): boolean => online;
