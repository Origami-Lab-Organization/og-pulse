#!/usr/bin/env node
// Importa dados abertos de fomento (FINEP, Lei do Bem) para public.fomento_publico.
// Uso, fontes e regras: .harness/integrations/fomento-publico.md. Sem --aplicar, só simula.

import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const FINEP_URL = 'https://download.finep.gov.br/Contratacao.xlsx';
const LINHA_CABECALHO = 7;
const LOTE = 500;
// Condições de financiamento repetem os contratos de crédito: contariam a mesma captação duas vezes.
const ABAS_IGNORADAS = /condi[cç][oõ]es/i;

const args = process.argv.slice(2);
const modo = args[0];
const opcao = (nome) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const aplicar = args.includes('--aplicar');

const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const cnpjValido = (c) => /^\d{14}$/.test(c);

// ── FINEP ─────────────────────────────────────────────────────────────────────

const COLUNAS_CNPJ = ['CNPJ Proponente', 'CNPJ Beneficiário', 'CNPJ da empresa investida', 'CNPJ Executor'];
const COLUNAS_NOME = ['Proponente', 'Razão Social', 'Razão Social da empresa investida', 'Executor'];
const COLUNAS_DATA = ['Data Assinatura', 'Data assinatura', 'Data da Contratação'];
const COLUNAS_VALOR = ['Valor Finep', 'Participação Finep', 'Valor total', 'Valor Total Contratado'];
const COLUNAS_TITULO = ['Título', 'Titulo do projeto'];
const COLUNAS_REF = ['Contrato', 'Ref', 'Referência Projeto'];

function texto(celula) {
  const v = celula?.value;
  if (v == null) return null;
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('');
  if (typeof v === 'object' && 'result' in v) return v.result;
  return v;
}

function anoDe(valor) {
  if (valor instanceof Date) return valor.getUTCFullYear();
  if (typeof valor === 'number' && valor > 20000) return new Date(Date.UTC(1899, 11, 30) + valor * 86400000).getUTCFullYear();
  const ano = Number(String(valor ?? '').match(/\b(19|20)\d{2}\b/)?.[0]);
  return Number.isFinite(ano) && ano > 1990 ? ano : null;
}

function numero(valor) {
  if (typeof valor === 'number') return valor;
  const n = Number(String(valor ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function indices(cabecalho, nomes) {
  return nomes.map((n) => cabecalho.indexOf(n)).filter((i) => i >= 0);
}

function linhasDaAba(aba) {
  const cabecalho = [];
  aba.getRow(LINHA_CABECALHO).eachCell({ includeEmpty: true }, (c, col) => {
    cabecalho[col] = String(texto(c) ?? '').trim();
  });
  const col = {
    cnpj: indices(cabecalho, COLUNAS_CNPJ),
    nome: indices(cabecalho, COLUNAS_NOME),
    data: indices(cabecalho, COLUNAS_DATA),
    valor: indices(cabecalho, COLUNAS_VALOR),
    titulo: indices(cabecalho, COLUNAS_TITULO),
    ref: indices(cabecalho, COLUNAS_REF),
  };
  if (col.cnpj.length === 0) return [];
  const saida = [];
  aba.eachRow((row, n) => {
    if (n <= LINHA_CABECALHO) return;
    const valorDe = (lista) => lista.map((i) => texto(row.getCell(i))).find((v) => v != null && v !== '');
    const cnpj = digitos(valorDe(col.cnpj));
    if (!cnpjValido(cnpj)) return;
    saida.push({
      fonte: 'finep',
      cnpj,
      razao_social: valorDe(col.nome) ? String(valorDe(col.nome)).trim().slice(0, 300) : null,
      ano: anoDe(valorDe(col.data)),
      valor: numero(valorDe(col.valor)),
      instrumento: aba.name.replace(/_+/g, ' ').trim(),
      descricao: valorDe(col.titulo) ? String(valorDe(col.titulo)).replace(/\s+/g, ' ').trim().slice(0, 300) : null,
      referencia: valorDe(col.ref) ? String(valorDe(col.ref)).trim() : null,
    });
  });
  return saida;
}

async function lerFinep() {
  const arquivo = opcao('arquivo');
  const livro = new ExcelJS.Workbook();
  if (arquivo) {
    await livro.xlsx.readFile(arquivo);
  } else {
    console.log(`baixando ${FINEP_URL}...`);
    const resposta = await fetch(FINEP_URL);
    if (!resposta.ok) throw new Error(`FINEP respondeu ${resposta.status}`);
    await livro.xlsx.load(Buffer.from(await resposta.arrayBuffer()));
  }
  const linhas = [];
  livro.eachSheet((aba) => {
    if (ABAS_IGNORADAS.test(aba.name)) return;
    const daAba = linhasDaAba(aba);
    if (daAba.length) console.log(`  ${aba.name}: ${daAba.length} linhas com CNPJ`);
    linhas.push(...daAba);
  });
  return linhas;
}

// ── Lei do Bem ────────────────────────────────────────────────────────────────

const CNPJ_NO_TEXTO = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/;

async function lerLeiDoBem() {
  const arquivo = opcao('arquivo');
  const ano = Number(opcao('ano'));
  if (!arquivo || !Number.isFinite(ano)) throw new Error('Use --arquivo <lista.txt|csv> --ano <ano-base>.');
  const conteudo = await readFile(arquivo, 'utf8');
  const linhas = [];
  for (const linha of conteudo.split(/\r?\n/)) {
    const achado = linha.match(CNPJ_NO_TEXTO);
    if (!achado) continue;
    const cnpj = digitos(achado[1]);
    if (!cnpjValido(cnpj)) continue;
    const nome = linha.slice(0, achado.index).replace(/^[\s\d;,."-]+/, '').replace(/[;,\s"]+$/, '').trim();
    linhas.push({
      fonte: 'lei_do_bem',
      cnpj,
      razao_social: nome ? nome.slice(0, 300) : null,
      ano,
      valor: null,
      instrumento: 'Lei do Bem (MCTI)',
      descricao: `Analisada no ano-base ${ano}`,
      referencia: `AB${ano}`,
    });
  }
  return linhas;
}

// ── Gravação ──────────────────────────────────────────────────────────────────

function semRepetidas(linhas) {
  const vistas = new Map();
  for (const l of linhas) vistas.set(`${l.fonte}|${l.cnpj}|${l.referencia ?? ''}|${l.ano ?? 0}`, l);
  return [...vistas.values()];
}

async function gravar(linhas) {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para --aplicar.');
  const supabase = createClient(url, chave, { auth: { persistSession: false } });
  for (let i = 0; i < linhas.length; i += LOTE) {
    const parte = linhas.slice(i, i + LOTE);
    const { error } = await supabase.rpc('import_fomento_publico', { p_linhas: parte }); // harness-ok: um lote diferente a cada volta
    if (error) throw new Error(`lote ${i / LOTE + 1}: ${error.message}`);
    process.stdout.write(`\r  gravadas ${Math.min(i + LOTE, linhas.length)} de ${linhas.length}`);
  }
  process.stdout.write('\n');
}

async function principal() {
  const leitores = { finep: lerFinep, 'lei-do-bem': lerLeiDoBem };
  const ler = leitores[modo];
  if (!ler) throw new Error('Modo: finep | lei-do-bem');
  const linhas = semRepetidas(await ler());
  const empresas = new Set(linhas.map((l) => l.cnpj)).size;
  console.log(`${linhas.length} linhas, ${empresas} empresas distintas.`);
  console.log('amostra:', linhas.slice(0, 3));
  if (!aplicar) return console.log('\nsimulação — nada gravado. Rode de novo com --aplicar para gravar.');
  await gravar(linhas);
  console.log('ok.');
}

principal().catch((e) => {
  console.error('erro:', e.message);
  process.exit(1);
});
