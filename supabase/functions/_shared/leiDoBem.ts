// Lei do Bem automática (13/10/2026): o que se lê do índice de lotes do MCTI e de cada PDF.
// Contrato: .harness/integrations/fomento-publico.md. Sem import nenhum, como fomento.ts:
// a leitura do PDF fica na Edge Function, e aqui só texto entra e sai.

export const INDICE_DE_LOTES = 'https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem/paginas/lotes';
/** Recorte decidido em 13/10/2026: do ano-base 2024 em diante. Os anteriores vêm em .zip/.7z. */
export const ANO_BASE_INICIAL = 2024;

export interface LoteDoIndice {
  url: string;
  ano: number;
}

export interface LinhaDaLeiDoBem {
  fonte: 'lei_do_bem';
  cnpj: string;
  razao_social: string | null;
  ano: number;
  valor: null;
  instrumento: string;
  descricao: string;
  referencia: string;
}

const LINK_DE_PDF = /href="(https:\/\/www\.gov\.br\/mcti\/[^"#?]+?\.pdf)(?:\/[^"]*)?"/gi;
const CNPJ = /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/;
const ANO_NO_TEXTO = /ano[\s-]base\s+(\d{4})/i;

/** O ano-base vem da pasta (`ano-base-2024/`) ou, sem ela, do fim do nome do arquivo. */
function anoDaUrl(url: string): number | null {
  const ano = url.match(/ano-base-(\d{4})/i)?.[1] ?? url.match(/(\d{4})\.pdf$/i)?.[1];
  return ano ? Number(ano) : null;
}

/** PDFs do índice a partir de `anoMinimo`. Manual e PDF sem ano no endereço ficam de fora. */
export function lotesDoIndice(html: string, anoMinimo = ANO_BASE_INICIAL): LoteDoIndice[] {
  const lotes = new Map<string, LoteDoIndice>();
  for (const [, url] of html.matchAll(LINK_DE_PDF)) {
    const ano = anoDaUrl(url);
    if (ano && ano >= anoMinimo) lotes.set(url, { url, ano });
  }
  return [...lotes.values()];
}

/** O próprio PDF diz o ano-base ("... no ano-base 2024"); o do endereço é a reserva. */
export function anoDoLote(linhas: string[], anoDoEndereco: number): number {
  for (const linha of linhas) {
    const ano = Number(linha.match(ANO_NO_TEXTO)?.[1]);
    if (ano > 1990) return ano;
  }
  return anoDoEndereco;
}

/**
 * Uma empresa por linha com CNPJ: "Nº  RAZÃO SOCIAL  00.000.000/0000-00". Mesma linha que
 * scripts/import-fomento.mjs grava — a referência por ano não duplica a empresa que aparece
 * em mais de um lote do mesmo ano.
 */
export function empresasDoLote(linhas: string[], ano: number): LinhaDaLeiDoBem[] {
  const empresas = new Map<string, LinhaDaLeiDoBem>();
  for (const linha of linhas) {
    const achado = linha.match(CNPJ);
    if (!achado || achado.index === undefined) continue;
    const cnpj = achado[1].replace(/\D/g, '');
    const nome = linha.slice(0, achado.index).replace(/^[\s\d;,."-]+/, '').trim();
    empresas.set(cnpj, {
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
  return [...empresas.values()];
}
