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

import { readFileSync } from 'node:fs';
import { Transform, type TransformCallback } from 'node:stream';
import { divisaoDoCnae, setorDoCnae, setoresERamos } from '@/lib/prospecting/cnae';
import { estimarFaturamento } from '@/lib/prospecting/faturamentoEstimado';
import { bestFit } from '@/lib/prospecting/fit';
import { fitDaBase } from '@/lib/prospecting/fitDaBase';
import { ARQUIVO_DESTINO, ARQUIVO_ORIGEM, lerAmbiente, psql, terminou, type Ambiente } from './psql';
import { chaveDoMunicipio, kmEntre } from './distancia';
import SEDES from './sedes-municipais.json';

const NULO = '\\N';
const aplicar = process.argv.includes('--aplicar');

// Fora do recorte (US-0003, 17/11/2026): quem não é cliente possível. Administração pública
// (1xxx), condomínio edilício, organização religiosa, órgãos e comitê de partido político,
// frente plebiscitária e candidato a cargo eletivo. A simulação imprime o nome de cada código,
// para conferir contra a tabela da Receita.
const NATUREZAS_FORA = ['3085', '3220', '3255', '3263', '3271', '3280', '3298', '4090'];

// Recorte: matrizes ativas, fora do exterior. A ordem das colunas é a de COLUNAS_DESTINO
// sem as nove últimas (fit, setor, ramo, faturamento estimado e distância), que o script acrescenta.
// Funcionários (US-0006, 17/11/2026): a RAIS pública não traz CNPJ. Valem os vínculos do
// cruzamento da base (empresas_funcionarios: CEP + CNAE + natureza) e, para o estabelecimento
// que ele não cruzou, o par único por CEP + CNAE — um só estabelecimento na RAIS e um só ativo
// na Receita com a mesma chave. Recuperou 66 mil estabelecimentos e 1,46 milhão de vínculos.
// Montado em passos simples numa tabela temporária antes da leitura: dentro do recorte, ou
// com NOT EXISTS, a consulta passou de 30 minutos (17/11/2026).
const FUNCIONARIOS = `
CREATE TEMP TABLE soltas AS
WITH rais_chave AS (
  SELECT cep, cnae_subclasse, max(vinculos_ativos) AS v FROM rais_estabelecimentos
  WHERE vinculos_ativos > 0 AND cep IS NOT NULL GROUP BY 1, 2 HAVING count(*) = 1
), receita_chave AS (
  SELECT cep, cnae_principal, min(cnpj) AS cnpj FROM estabelecimentos
  WHERE situacao_codigo = '02' AND cep IS NOT NULL GROUP BY 1, 2 HAVING count(*) = 1
)
SELECT rc.cnpj, r.v FROM rais_chave r JOIN receita_chave rc ON rc.cep = r.cep AND rc.cnae_principal = r.cnae_subclasse;
DELETE FROM soltas s USING empresas_funcionarios ef WHERE ef.cnpj = s.cnpj;
CREATE TEMP TABLE f AS
SELECT cnpj_basico::char(8) AS cnpj_basico, sum(v) AS vinculos_ativos, count(*) AS unidades_ativas FROM (
  SELECT cnpj_basico, vinculos_ativos AS v FROM empresas_funcionarios
  UNION ALL
  SELECT left(cnpj, 8), v FROM soltas
) u GROUP BY 1;
CREATE UNIQUE INDEX ON f (cnpj_basico);
ANALYZE f`.replace(/\s+/g, ' ');

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
LEFT JOIN f USING (cnpj_basico)
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
  'fit_previo', 'fit_frente', 'secao', 'divisao', 'secoes_sec', 'divisoes_sec', 'faturamento_estimado',
  'faturamento_base', 'distancia_km',
].join(', ');

const COL = {
  razao: 2, cnaePrincipal: 5, cnaesSecundarios: 6, natureza: 7, capital: 8, abertura: 9, municipio: 10, uf: 11, funcionarios: 12,
  filiais: 14, socios: 15, divida: 16, email: 20, telefone: 21,
} as const;

// ---------- transformação ----------

/** Nota de fit prévio pela regra da tela, só com o que a Receita informa (fitDaBase). */
function fitPrevio(cnaePrincipal: string, secundarios: string[], abertura: string | null, hoje: string) {
  return bestFit(fitDaBase(cnaePrincipal, secundarios, abertura, hoje));
}

interface Resumo {
  linhas: number;
  porFrente: Record<string, number>;
  porFaixaDeFit: Record<string, number>;
  porFaixaDeFaturamento: Record<string, number>;
  semDistancia: number;
}

const FAIXAS_DE_FATURAMENTO: ReadonlyArray<[number, string]> = [[300e6, 'âncora'], [100e6, 'ponte'], [10e6, 'satélite'], [0, 'abaixo de 10 mi']];
const VERDADEIRO = 't';

const texto = (v: string) => (v === NULO ? null : v);
const numero = (v: string) => (v === NULO ? null : Number(v));

const FORMIGA = SEDES.formiga as [number, number];
const COORDENADAS = SEDES.sedes as Record<string, [number, number]>;

/** Km em linha reta da sede de Formiga à sede do município (US-0015); nulo sem município reconhecido. */
function colunaDeDistancia(campos: string[], resumo: Resumo): string {
  const municipio = texto(campos[COL.municipio]);
  const uf = texto(campos[COL.uf]);
  const sede = municipio && uf ? COORDENADAS[chaveDoMunicipio(uf, municipio)] : undefined;
  if (!sede) {
    resumo.semDistancia += 1;
    return NULO;
  }
  return String(kmEntre(FORMIGA, sede));
}

/** Faturamento estimado e a base dele (US-0006), no formato do COPY em texto. */
function colunasDeFaturamento(campos: string[], hoje: string, resumo: Resumo): string {
  const cnae = campos[COL.cnaePrincipal];
  const { valor, base } = estimarFaturamento(cnae, numero(campos[COL.funcionarios]), {
    nome: texto(campos[COL.razao]),
    secao: setorDoCnae(cnae) ?? null,
    natureza: texto(campos[COL.natureza]),
    capital: numero(campos[COL.capital]),
    abertura: texto(campos[COL.abertura]),
    filiais: Number(campos[COL.filiais]),
    socios: Number(campos[COL.socios]),
    uf: texto(campos[COL.uf]),
    divida: numero(campos[COL.divida]),
    email: campos[COL.email] === VERDADEIRO,
    telefone: campos[COL.telefone] === VERDADEIRO,
  }, hoje);
  const faixa = `${base}: ${FAIXAS_DE_FATURAMENTO.find(([piso]) => valor >= piso)![1]}`;
  resumo.porFaixaDeFaturamento[faixa] = (resumo.porFaixaDeFaturamento[faixa] ?? 0) + 1;
  return `${valor}\t${base}`;
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
  const atividade = colunasDeAtividade(campos[COL.cnaePrincipal], secundarios);
  return `${linha}\t${nota}\t${frente}\t${atividade}\t${colunasDeFaturamento(campos, hoje, resumo)}\t${colunaDeDistancia(campos, resumo)}\n`;
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
  const leitura = psql(origem, ['-c', 'SET statement_timeout = 0', '-c', FUNCIONARIOS, '-c', `\\copy (${RECORTE}) TO STDOUT`]);
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
  console.log('Por faixa de faturamento estimado:', resumo.porFaixaDeFaturamento);
  console.log('Sem distância (município não reconhecido):', resumo.semDistancia);
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
  const resumo: Resumo = { linhas: 0, porFrente: {}, porFaixaDeFit: {}, porFaixaDeFaturamento: {}, semDistancia: 0 };
  await carregarEmpresas(origem, destino, resumo);
  imprimirResumo(resumo, Math.round((Date.now() - inicio) / 1000));
}

main().catch((erro: Error) => {
  // Só a mensagem: nada de dado de empresa nem de conexão no log.
  console.error(`Falhou: ${erro.message}`);
  process.exit(1);
});
