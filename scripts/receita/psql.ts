// Conexão com os bancos da base da Receita pelo psql (ADR-0053): o da máquina, ou o do
// container postgres:16-alpine (Docker). As credenciais vão no ambiente, nunca na linha de
// comando nem em log. Usado pela carga e pela calibração do faturamento estimado.

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type Ambiente = Record<string, string>;

const IMAGEM_PSQL = 'postgres:16-alpine';

// RECEITA_ORIGEM_ENV e RECEITA_DESTINO_ENV trocam os arquivos (ex.: um banco de ensaio).
export const ARQUIVO_ORIGEM = process.env.RECEITA_ORIGEM_ENV ?? join(homedir(), '.config/og-pulse/receita-db.env');
export const ARQUIVO_DESTINO = process.env.RECEITA_DESTINO_ENV ?? join(homedir(), '.config/og-pulse/receita-carga.env');


/** Arquivo de variáveis PG* (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD). */
export function lerAmbiente(arquivo: string): Ambiente {
  const texto = readFileSync(arquivo, 'utf8');
  const pares = texto.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  return Object.fromEntries(pares.map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}

const temPsqlLocal = () => spawnSync('psql', ['--version'], { stdio: 'ignore' }).status === 0;

/** psql com as variáveis de conexão no ambiente (nunca na linha de comando). */
export function psql(ambiente: Ambiente, args: string[]): ChildProcess {
  const comuns = ['-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args];
  if (temPsqlLocal()) {
    const host = ambiente.PGHOST === 'host.docker.internal' ? '127.0.0.1' : ambiente.PGHOST;
    return spawn('psql', comuns, { env: { ...process.env, ...ambiente, PGHOST: host }, stdio: ['pipe', 'pipe', 'inherit'] });
  }
  const envs = Object.keys(ambiente).flatMap((k) => ['-e', k]);
  // Rodando na própria VPS (RECEITA_NA_VPS=1), o container usa a rede do servidor: sem túnel, a
  // carga não depende da conexão de quem a dispara (26/11/2026: o túnel caiu quatro vezes seguidas).
  const rede = process.env.RECEITA_NA_VPS ? '--network=host' : '--add-host=host.docker.internal:host-gateway';
  const docker = ['run', '--rm', '-i', ...envs, rede, IMAGEM_PSQL, 'psql', ...comuns];
  return spawn('docker', docker, { env: { ...process.env, ...ambiente }, stdio: ['pipe', 'pipe', 'inherit'] });
}

export function terminou(processo: ChildProcess, nome: string): Promise<void> {
  return new Promise((resolve, reject) => {
    processo.on('error', reject);
    processo.on('close', (codigo) => (codigo === 0 ? resolve() : reject(new Error(`${nome} terminou com código ${codigo}`))));
  });
}

