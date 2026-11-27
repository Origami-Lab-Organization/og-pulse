/**
 * Roda o Claude Code com a assinatura do dono do runner (ADR-0057), isolado: só busca e leitura
 * na web, sem MCP, sem as configurações e os ganchos do usuário, numa pasta vazia e sem guardar a
 * sessão. A resposta vem no formato do `--json-schema`.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LIMITE_MS = 15 * 60 * 1000;

export class FalhaDaGeracao extends Error {}

function argumentos(pedido: string, formato: object): string[] {
  return [
    '-p', pedido,
    '--output-format', 'json',
    '--json-schema', JSON.stringify(formato),
    '--tools', 'WebSearch', 'WebFetch',
    '--allowedTools', 'WebSearch', 'WebFetch',
    '--strict-mcp-config',
    '--setting-sources', 'project',
    '--no-session-persistence',
  ];
}

function executar(args: string[], pasta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const processo = spawn(process.env.CLAUDE_BIN ?? 'claude', args, { cwd: pasta, stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    const relogio = setTimeout(() => processo.kill('SIGTERM'), LIMITE_MS);
    processo.stdout.on('data', (parte: Buffer) => { saida += parte.toString(); });
    processo.on('error', () => reject(new FalhaDaGeracao('Claude Code não encontrado nesta máquina.')));
    processo.on('close', (codigo, sinal) => {
      clearTimeout(relogio);
      if (sinal) reject(new FalhaDaGeracao('Tempo esgotado.'));
      else if (codigo !== 0 && !saida) reject(new FalhaDaGeracao('O Claude Code parou com erro.'));
      else resolve(saida);
    });
  });
}

interface Resultado {
  is_error?: boolean;
  subtype?: string;
  result?: string;
  structured_output?: unknown;
}

function lerResultado(saida: string): unknown {
  let resultado: Resultado;
  try {
    resultado = JSON.parse(saida) as Resultado;
  } catch {
    throw new FalhaDaGeracao('Resposta fora do formato.');
  }
  if (resultado.is_error || resultado.subtype !== 'success') {
    const limite = /limit|quota|rate/i.test(resultado.result ?? '');
    throw new FalhaDaGeracao(limite ? 'Limite de uso da assinatura.' : 'O Claude não conseguiu gerar.');
  }
  if (!resultado.structured_output) throw new FalhaDaGeracao('Resposta fora do formato.');
  return resultado.structured_output;
}

export async function perguntarAoClaude(pedido: string, formato: object): Promise<unknown> {
  const pasta = await mkdtemp(join(tmpdir(), 'insights-'));
  try {
    return lerResultado(await executar(argumentos(pedido, formato), pasta));
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
}
