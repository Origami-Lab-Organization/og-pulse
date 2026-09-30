#!/usr/bin/env node
// Listas de empresas-alvo (BNDES + FINEP, dados abertos) para o "Importar CNPJs". Só lê e
// grava arquivos locais. Uso e critérios: .harness/integrations/fomento-publico.md.

import { mkdir, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';

const BNDES_RECURSO = '6f56b78c-510f-44b6-8274-78a5b7e931f4';
const FINEP_URL = 'https://download.finep.gov.br/Contratacao.xlsx';
const LOTE = 500;
const LINHA_CABECALHO = 7;

const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};
const UFS = opcao('ufs', 'MG,SP,RJ,ES').split(',').map((u) => u.trim().toUpperCase());
const SAIDA = opcao('saida', 'listas-alvo');

const digitos = (v) => String(v ?? '').replace(/\D/g, '');
// Quem não compra consultoria/software como empresa: institutos, fundações, universidades, órgãos.
const NAO_EMPRESA = /\b(FUNDA[CÇ][AÃ]O|ASSOCIA[CÇ][AÃ]O|INSTITUTO|UNIVERSIDADE|FACULDADE|CENTRO DE|SERVI[CÇ]O NACIONAL|SERVI[CÇ]O SOCIAL|MUNIC[IÍ]PIO|ESTADO D[OE]|PREFEITURA|SECRETARIA|FUNDO|COOPERATIVA DE CR[EÉ]DITO|EMBRAPA|CONSELHO)\b/i;
const PORTES_ALVO = new Set(['MÉDIA', 'GRANDE']);
const SECOES_INDUSTRIA = new Set(['B', 'C']);

// ── BNDES ─────────────────────────────────────────────────────────────────────

function linhasCsv(texto) {
  const [cabecalho, ...linhas] = texto.split(/\r?\n/).filter(Boolean);
  const campos = (l) => l.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
  const nomes = campos(cabecalho);
  return linhas.map((l) => Object.fromEntries(campos(l).map((v, i) => [nomes[i], v])));
}

const INOVACAO_SIM = 'SIM';

function ehAlvoBndes(r) {
  const checagens = [
    SECOES_INDUSTRIA.has((r.subsetor_cnae_codigo ?? ' ')[0]),
    digitos(r.cnpj).length === 14,
    PORTES_ALVO.has(r.porte_do_cliente),
    /PRIVADA/.test(r.natureza_do_cliente),
    UFS.includes(r.uf),
    !NAO_EMPRESA.test(r.cliente),
  ];
  return checagens.every(Boolean);
}

async function bndes() {
  const meta = await (await fetch(`https://dadosabertos.bndes.gov.br/api/3/action/resource_show?id=${BNDES_RECURSO}`)).json();
  console.log('BNDES: baixando operações não automáticas...');
  const bruto = Buffer.from(await (await fetch(meta.result.url)).arrayBuffer());
  const linhas = linhasCsv(new TextDecoder('latin1').decode(bruto));
  const alvos = [];
  for (const r of linhas) {
    if (!ehAlvoBndes(r)) continue;
    alvos.push({
      cnpj: digitos(r.cnpj),
      nome: r.cliente,
      uf: r.uf,
      municipio: r.municipio,
      fonte: 'BNDES',
      inovacao: r.inovacao === INOVACAO_SIM,
      ano: Number(r.data_da_contratacao?.slice(0, 4)) || null,
      valor: Number(String(r.valor_contratado_reais).replace(',', '.')) || 0,
      setor: r.subsetor_cnae_nome,
      porte: r.porte_do_cliente,
    });
  }
  return alvos;
}

// ── FINEP ─────────────────────────────────────────────────────────────────────

// ICTs recebem não reembolsável como instituição, não como empresa; condições repetem contratos.
const ABAS_FORA = /ICTs|condi[cç][oõ]es|ANCINE/i;
const COL = {
  cnpj: ['CNPJ Proponente', 'CNPJ Beneficiário', 'CNPJ da empresa investida'],
  nome: ['Proponente', 'Razão Social', 'Razão Social da empresa investida'],
  uf: ['UF Proponente', 'UF Empresa', 'UF'],
  municipio: ['Município Proponente', 'Municipio'],
  data: ['Data Assinatura', 'Data assinatura', 'Data da Contratação'],
  valor: ['Valor Finep', 'Participação Finep', 'Valor Total Contratado'],
  porte: ['Porte Empresa'],
};

const texto = (c) => {
  const v = c?.value;
  if (v && typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('');
  if (v && typeof v === 'object' && 'result' in v) return v.result;
  return v;
};

function anoDe(v) {
  if (v instanceof Date) return v.getUTCFullYear();
  if (typeof v === 'number' && v > 20000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).getUTCFullYear();
  return Number(String(v ?? '').match(/\b(19|20)\d{2}\b/)?.[0]) || null;
}

const ehAlvoFinep = (cnpj, nome, uf) => cnpj.length === 14 && UFS.includes(uf) && !NAO_EMPRESA.test(nome);
const FONTE_BNDES = 'BNDES';
const UF_PRIORITARIA = 'MG';

function linhasDaAba(aba) {
  const cab = [];
  aba.getRow(LINHA_CABECALHO).eachCell({ includeEmpty: true }, (c, i) => (cab[i] = String(texto(c) ?? '').trim()));
  const idx = Object.fromEntries(Object.entries(COL).map(([k, nomes]) => [k, nomes.map((n) => cab.indexOf(n)).filter((i) => i >= 0)]));
  if (idx.cnpj.length === 0) return [];
  const saida = [];
  aba.eachRow((row, n) => {
    if (n <= LINHA_CABECALHO) return;
    const de = (k) => idx[k].map((i) => texto(row.getCell(i))).find((v) => v != null && v !== '');
    const cnpj = digitos(de('cnpj'));
    const nome = String(de('nome') ?? '').trim();
    const uf = String(de('uf') ?? '').trim().toUpperCase();
    if (!ehAlvoFinep(cnpj, nome, uf)) return;
    saida.push({
      cnpj, nome, uf, municipio: String(de('municipio') ?? ''), fonte: 'FINEP', inovacao: true,
      ano: anoDe(de('data')), valor: Number(de('valor')) || 0, setor: aba.name.replace(/_+/g, ' '),
      porte: String(de('porte') ?? ''),
    });
  });
  return saida;
}

async function finep() {
  console.log('FINEP: baixando projetos contratados...');
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.load(Buffer.from(await (await fetch(FINEP_URL)).arrayBuffer()));
  const alvos = [];
  livro.eachSheet((aba) => {
    if (!ABAS_FORA.test(aba.name)) alvos.push(...linhasDaAba(aba));
  });
  return alvos;
}

// ── Consolidação e prioridade ─────────────────────────────────────────────────

// Uma linha por empresa. Prioridade: MG primeiro (Rede Origami), depois inovação declarada,
// presença nas duas fontes, operação mais recente e maior valor.
function consolidar(operacoes) {
  const porCnpj = new Map();
  for (const op of operacoes) {
    const atual = porCnpj.get(op.cnpj) ?? { ...op, fontes: new Set(), operacoes: 0, valorTotal: 0, anoMaisRecente: 0 };
    atual.fontes.add(op.fonte);
    atual.operacoes += 1;
    atual.valorTotal += op.valor;
    atual.inovacao ||= op.inovacao;
    atual.anoMaisRecente = Math.max(atual.anoMaisRecente, op.ano ?? 0);
    if (op.fonte === FONTE_BNDES && op.setor) atual.setor = op.setor;
    porCnpj.set(op.cnpj, atual);
  }
  const peso = (e) =>
    (e.uf === UF_PRIORITARIA ? 1000 : 0) + (e.inovacao ? 200 : 0) + (e.fontes.size > 1 ? 150 : 0) +
    Math.max(0, e.anoMaisRecente - 2010) * 5 + Math.min(100, Math.log10(e.valorTotal + 1) * 10);
  return [...porCnpj.values()].sort((a, b) => peso(b) - peso(a));
}

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function gravar(empresas) {
  await mkdir(SAIDA, { recursive: true });
  const linhas = empresas.map((e, i) =>
    [i + 1, e.cnpj, e.nome, e.uf, e.municipio, [...e.fontes].join('+'), e.inovacao ? 'sim' : 'não', e.anoMaisRecente || '', Math.round(e.valorTotal), e.setor, e.porte].map(csv).join(';'),
  );
  const cabecalho = ['prioridade', 'cnpj', 'razao_social', 'uf', 'municipio', 'fontes', 'inovacao', 'ano_mais_recente', 'valor_total_reais', 'setor', 'porte'].join(';');
  await writeFile(`${SAIDA}/alvos-completo.csv`, `${cabecalho}\n${linhas.join('\n')}\n`);
  const grupos = { mg: empresas.filter((e) => e.uf === UF_PRIORITARIA), sudeste: empresas.filter((e) => e.uf !== UF_PRIORITARIA) };
  for (const [nome, lista] of Object.entries(grupos)) {
    for (let i = 0; i * LOTE < lista.length; i++) {
      const lote = lista.slice(i * LOTE, (i + 1) * LOTE).map((e) => e.cnpj).join('\n');
      await writeFile(`${SAIDA}/lote-${nome}-${String(i + 1).padStart(2, '0')}.txt`, `${lote}\n`); // harness-ok: um arquivo por lote
    }
  }
  return grupos;
}

const empresas = consolidar([...(await bndes()), ...(await finep())]);
const grupos = await gravar(empresas);
console.log(`\n${empresas.length} empresas-alvo em ${UFS.join(', ')}: MG ${grupos.mg.length}, demais ${grupos.sudeste.length}.`);
console.log(`Arquivos em ${SAIDA}/ — alvos-completo.csv (todas, com prioridade) e lote-*.txt (500 CNPJs cada, para colar).`);
