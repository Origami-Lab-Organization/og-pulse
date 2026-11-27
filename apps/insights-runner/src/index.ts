/**
 * Runner local dos insights de IA (US-0057, ADR-0057). Roda no Mac de quem gera, com a assinatura
 * do Claude dessa pessoa, e atende só os pedidos dela. Só faz conexão de saída: dá sinal de vida a
 * cada 30 s (a página mostra "Runner indisponível" sem sinal há 90 s) e olha a fila a cada 5 s.
 *
 * Uso: `npm start` em apps/insights-runner, com ~/.og-pulse/insights-runner.env (ver README).
 */
import { conectar } from './supabase.js';
import { darSinal, liberarInterrompidos, processar, proximoPedido } from './fila.js';

const SINAL_MS = 30_000;
const FILA_MS = 5_000;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const registrar = (texto: string) => console.log(`${new Date().toLocaleTimeString('pt-BR')} ${texto}`);

async function sinalSemQueda(con: Awaited<ReturnType<typeof conectar>>) {
  try {
    await darSinal(con);
  } catch (erro) {
    registrar((erro as Error).message);
  }
}

async function main() {
  const con = await conectar();
  await liberarInterrompidos(con);
  await sinalSemQueda(con);
  setInterval(() => void sinalSemQueda(con), SINAL_MS);
  registrar('Runner de insights no ar.');
  for (;;) {
    const pedido = await proximoPedido(con).catch(() => null);
    if (!pedido) {
      await esperar(FILA_MS);
      continue;
    }
    registrar(`Pedido ${pedido.id}: gerando.`);
    const ok = await processar(con, pedido);
    registrar(`Pedido ${pedido.id}: ${ok ? 'pronto' : 'falhou'}.`);
  }
}

process.on('SIGINT', () => process.exit(0));
main().catch((erro: Error) => {
  console.error(erro.message);
  process.exit(1);
});
