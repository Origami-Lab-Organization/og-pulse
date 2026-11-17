// Monta, na própria VPS, o recorte que a tela Empresas lê (ADR-0053, US-0001).
//
// Uso (com o túnel SSH aberto: ssh -N -L 5433:localhost:5432 root@<vps>):
//   npx vite-node scripts/receita/sincronizar-base.ts             só lê, calcula e resume
//   npx vite-node scripts/receita/sincronizar-base.ts -- --aplicar grava em pulse.empresas
//
// Origem: ~/.config/og-pulse/receita-db.env — usuário só de leitura `pulse_leitura`.
// Destino: ~/.config/og-pulse/receita-carga.env — usuário `pulse_carga`, dono do schema pulse.
// Os dois arquivos ficam fora do repositório (permissão 600) e nunca vão para log.
// O Supabase não guarda nada da base: a tela lê pela Edge Function `empresas-receita`.
//
// Usa o `psql` da máquina; sem ele, o do container `postgres:16-alpine` (Docker).
// A nota de fit prévio sai do MESMO módulo da tela (src/lib/prospecting/fit.ts, ADR-0042).

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Transform, type TransformCallback } from 'node:stream';
import { divisaoDoCnae, setorDoCnae, setoresERamos } from '@/lib/prospecting/cnae';
import { bestFit, companyFit } from '@/lib/prospecting/fit';
import type { ProspectCompanyDB } from '@/types/prospect';

type Ambiente = Record<string, string>;

// RECEITA_ORIGEM_ENV e RECEITA_DESTINO_ENV trocam os arquivos (ex.: um banco de ensaio).
const ARQUIVO_ORIGEM = process.env.RECEITA_ORIGEM_ENV ?? join(homedir(), '.config/og-pulse/receita-db.env');
const ARQUIVO_DESTINO = process.env.RECEITA_DESTINO_ENV ?? join(homedir(), '.config/og-pulse/receita-carga.env');
const IMAGEM_PSQL = 'postgres:16-alpine';
const NULO = '\\N';
const aplicar = process.argv.includes('--aplicar');

// Fora do recorte (US-0003, 17/11/2026): quem não é cliente possível. Administração pública
// (1xxx), condomínio edilício, organização religiosa, órgãos e comitê de partido político,
// frente plebiscitária e candidato a cargo eletivo. A simulação imprime o nome de cada código,
// para conferir contra a tabela da Receita.
const NATUREZAS_FORA = ['3085', '3220', '3255', '3263', '3271', '3280', '3298', '4090'];

// Recorte: matrizes ativas, fora do exterior. A ordem das colunas é a de COLUNAS_DESTINO
// sem as seis últimas (fit, setor e ramo), que o script acrescenta.
const RECORTE = `
WITH filiais AS (
  SELECT cnpj_basico, count(*) AS n FROM estabelecimentos
  WHERE situacao_codigo = '02' AND matriz_filial = 'Filial' GROUP BY 1
), socios_n AS (
  SELECT cnpj_basico, count(*) AS n FROM socios GROUP BY 1
)
SELECT s.cnpj, s.cnpj_basico,
  coalesce(nullif(trim(e.razao_social), ''), s.cnpj),
  nullif(trim(s.nome_fantasia), ''),
  coalesce(nullif(trim(s.nome_fantasia), ''), nullif(trim(e.razao_social), ''), s.cnpj),
  s.cnae_principal,
  '{' || coalesce(nullif(trim(s.cnaes_secundarios), ''), '') || '}',
  e.natureza_juridica_codigo, e.capital_social_valido, s.data_inicio_atividade,
  nullif(trim(s.municipio), ''), s.uf,
  f.vinculos_ativos, f.unidades_ativas, coalesce(fi.n, 0), coalesce(so.n, 0),
  p.divida_total, p.divida_em_cobranca, p.divida_ajuizada, p.qtd_inscricoes,
  coalesce(s.email LIKE '%@%', false), coalesce(s.telefone_1 ~ '[1-9]', false)
FROM estabelecimentos s
JOIN empresas e USING (cnpj_basico)
LEFT JOIN empresas_funcionarios_total f USING (cnpj_basico)
LEFT JOIN pgfn_resumo p USING (cnpj_basico)
LEFT JOIN filiais fi USING (cnpj_basico)
LEFT JOIN socios_n so USING (cnpj_basico)
WHERE s.situacao_codigo = '02' AND s.matriz_filial = 'Matriz' AND s.uf <> 'EX'
  AND s.cnae_principal IS NOT NULL
  AND coalesce(e.natureza_juridica_codigo, '') NOT LIKE '1%'
  AND coalesce(e.natureza_juridica_codigo, '') NOT IN (${NATUREZAS_FORA.map((c) => `'${c}'`).join(', ')})`.replace(/\s+/g, ' ');

const COLUNAS_DESTINO = [
  'cnpj', 'cnpj_basico', 'razao_social', 'nome_fantasia', 'nome_exibicao', 'cnae_principal',
  'cnaes_secundarios', 'natureza_juridica', 'capital_social', 'data_inicio_atividade', 'municipio',
  'uf', 'funcionarios', 'unidades_com_funcionarios', 'filiais_ativas', 'socios', 'divida_total',
  'divida_em_cobranca', 'divida_ajuizada', 'inscricoes_divida', 'tem_email', 'tem_telefone',
  'fit_previo', 'fit_frente', 'secao', 'divisao', 'secoes_sec', 'divisoes_sec',
].join(', ');

const COL = { cnaePrincipal: 5, cnaesSecundarios: 6, abertura: 9 } as const;

// ---------- conexões ----------

/** Arquivo de variáveis PG* (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD). */
function lerAmbiente(arquivo: string): Ambiente {
  const texto = readFileSync(arquivo, 'utf8');
  const pares = texto.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  return Object.fromEntries(pares.map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}

const temPsqlLocal = () => spawnSync('psql', ['--version'], { stdio: 'ignore' }).status === 0;

/** psql com as variáveis de conexão no ambiente (nunca na linha de comando). */
function psql(ambiente: Ambiente, args: string[]): ChildProcess {
  const comuns = ['-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args];
  if (temPsqlLocal()) {
    const host = ambiente.PGHOST === 'host.docker.internal' ? '127.0.0.1' : ambiente.PGHOST;
    return spawn('psql', comuns, { env: { ...process.env, ...ambiente, PGHOST: host }, stdio: ['pipe', 'pipe', 'inherit'] });
  }
  const envs = Object.keys(ambiente).flatMap((k) => ['-e', k]);
  const docker = ['run', '--rm', '-i', ...envs, '--add-host=host.docker.internal:host-gateway', IMAGEM_PSQL, 'psql', ...comuns];
  return spawn('docker', docker, { env: { ...process.env, ...ambiente }, stdio: ['pipe', 'pipe', 'inherit'] });
}

function terminou(processo: ChildProcess, nome: string): Promise<void> {
  return new Promise((resolve, reject) => {
    processo.on('error', reject);
    processo.on('close', (codigo) => (codigo === 0 ? resolve() : reject(new Error(`${nome} terminou com código ${codigo}`))));
  });
}

// ---------- transformação ----------

/** Nota de fit prévio pela regra da tela, só com o que a Receita informa. */
function fitPrevio(cnaePrincipal: string, secundarios: string[], abertura: string | null, hoje: string) {
  // Só os campos que companyFit lê; o resto do cadastro não existe para empresa da base.
  const empresa = {
    receita_consultada_em: hoje,
    situacao_cadastral: 'Ativa',
    porte: 'DEMAIS',
    data_abertura: abertura,
    regime_tributario: null,
    site_scan: null,
    receita: {
      cnaePrincipal: { codigo: cnaePrincipal, descricao: '' },
      cnaesSecundarios: secundarios.map((codigo) => ({ codigo, descricao: '' })),
    },
  } as unknown as ProspectCompanyDB;
  return bestFit(companyFit(empresa));
}

interface Resumo {
  linhas: number;
  porFrente: Record<string, number>;
  porFaixaDeFit: Record<string, number>;
}

function linhaComFit(linha: string, hoje: string, resumo: Resumo): string {
  const campos = linha.split('\t');
  const secundarios = campos[COL.cnaesSecundarios].replace(/[{}]/g, '').split(',').filter(Boolean);
  const abertura = campos[COL.abertura] === NULO ? null : campos[COL.abertura];
  const fit = fitPrevio(campos[COL.cnaePrincipal], secundarios, abertura, hoje);
  const nota = fit?.nota ?? 0;
  const frente = fit?.frente ?? 'consultoria';
  resumo.linhas += 1;
  resumo.porFrente[frente] = (resumo.porFrente[frente] ?? 0) + 1;
  const faixa = `${Math.floor(nota / 10) * 10}`;
  resumo.porFaixaDeFit[faixa] = (resumo.porFaixaDeFit[faixa] ?? 0) + 1;
  return `${linha}\t${nota}\t${frente}\t${colunasDeAtividade(campos[COL.cnaePrincipal], secundarios)}\n`;
}

/** Setor e ramo do principal e dos secundários (US-0003), no formato do COPY em texto. */
function colunasDeAtividade(principal: string, secundarios: string[]): string {
  const { setores, ramos } = setoresERamos(secundarios);
  return [setorDoCnae(principal) ?? NULO, divisaoDoCnae(principal), `{${setores.join(',')}}`, `{${ramos.join(',')}}`].join('\t');
}

/** Lê o COPY em texto (uma linha por registro) e acrescenta fit, setor e ramo. */
function acrescentarFit(hoje: string, resumo: Resumo): Transform {
  let sobra = '';
  return new Transform({
    transform(pedaco: Buffer, _enc: BufferEncoding, pronto: TransformCallback) {
      const linhas = (sobra + pedaco.toString('utf8')).split('\n');
      sobra = linhas.pop() ?? '';
      pronto(null, linhas.map((l) => linhaComFit(l, hoje, resumo)).join(''));
    },
    flush(pronto: TransformCallback) {
      pronto(null, sobra ? linhaComFit(sobra, hoje, resumo) : '');
    },
  });
}

// ---------- carga ----------

// Tabela e índices (reexecutável). Roda dentro da transação da carga: na primeira vez depois
// de uma coluna nova, o índice é criado sobre a carga anterior — leva alguns minutos, uma vez.
const ESQUEMA = readFileSync(new URL('./vps/esquema.sql', import.meta.url), 'utf8');

function comandosDaCarga(): string[] {
  return [
    '-1',
    '-c', 'SET statement_timeout = 0',
    '-c', 'SET client_min_messages = warning', // sem um aviso por índice que já existe
    '-c', ESQUEMA,
    '-c', 'TRUNCATE pulse.empresas',
    '-c', `\\copy pulse.empresas (${COLUNAS_DESTINO}) FROM pstdin`,
    '-c', `INSERT INTO pulse.base (id, carregada_em, total)
           SELECT true, now(), count(*) FROM pulse.empresas
           ON CONFLICT (id) DO UPDATE SET carregada_em = EXCLUDED.carregada_em, total = EXCLUDED.total`,
  ];
}

async function carregarEmpresas(origem: Ambiente, destino: Ambiente | null, resumo: Resumo) {
  const hoje = new Date().toISOString().slice(0, 10);
  const leitura = psql(origem, ['-c', `\\copy (${RECORTE}) TO STDOUT`]);
  const comFit = leitura.stdout!.pipe(acrescentarFit(hoje, resumo));
  if (!destino) {
    const fim = new Promise((r) => comFit.on('end', r)); // antes de ler, para não perder o fim
    comFit.resume(); // simulação: só conta
    await Promise.all([terminou(leitura, 'leitura da base'), fim]);
    return;
  }
  const escrita = psql(destino, comandosDaCarga());
  comFit.pipe(escrita.stdin!);
  await Promise.all([terminou(leitura, 'leitura da base'), terminou(escrita, 'carga da base')]);
  // VACUUM, não só ANALYZE: grava de uma vez as marcas de visibilidade que a primeira leitura
  // de cada página gravaria (medido em 17/11/2026: a 1ª contagem do setor levou 4,5 s, perto
  // do limite de 5 s; depois, 0,14 s) e deixa a contagem usar só o índice.
  await terminou(psql(destino, ['-c', 'SET statement_timeout = 0', '-c', 'VACUUM (ANALYZE) pulse.empresas']), 'VACUUM');
}

function imprimirResumo(resumo: Resumo, segundos: number) {
  console.log(`\n${aplicar ? 'Carregadas' : 'Lidas (simulação, nada gravado)'}: ${resumo.linhas.toLocaleString('pt-BR')} empresas em ${segundos}s`);
  console.log('Por frente de maior fit:', resumo.porFrente);
  console.log('Por faixa de fit prévio:', resumo.porFaixaDeFit);
}

/** O nome de cada natureza fora do recorte, lido da base: um código errado aparece aqui. */
async function conferirNaturezas(origem: Ambiente) {
  const codigos = NATUREZAS_FORA.map((c) => `'${c}'`).join(', ');
  const consulta = psql(origem, ['-tA', '-c', `SELECT codigo || ' ' || descricao FROM naturezas_juridicas WHERE codigo IN (${codigos}) ORDER BY 1`]);
  let saida = '';
  consulta.stdout!.on('data', (d: Buffer) => { saida += d.toString('utf8'); });
  await terminou(consulta, 'leitura das naturezas');
  console.log('Fora do recorte, além da administração pública (1xxx):');
  saida.trim().split('\n').forEach((l) => console.log(`  ${l}`));
}

async function main() {
  const origem = lerAmbiente(ARQUIVO_ORIGEM);
  await conferirNaturezas(origem);
  const destino = aplicar ? lerAmbiente(ARQUIVO_DESTINO) : null;
  const inicio = Date.now();
  const resumo: Resumo = { linhas: 0, porFrente: {}, porFaixaDeFit: {} };
  await carregarEmpresas(origem, destino, resumo);
  imprimirResumo(resumo, Math.round((Date.now() - inicio) / 1000));
}

main().catch((erro: Error) => {
  // Só a mensagem: nada de dado de empresa nem de conexão no log.
  console.error(`Falhou: ${erro.message}`);
  process.exit(1);
});
