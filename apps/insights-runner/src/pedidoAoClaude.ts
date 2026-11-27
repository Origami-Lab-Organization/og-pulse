/**
 * O que o runner pede ao Claude (US-0057): um bloco por pedido (produtos, clientes, concorrentes,
 * notícias ou porte), cada item com fonte. A regra do ADR-0054 vai no pedido e volta a ser
 * conferida no banco (item sem fonte não fica; proposta sem fonte http(s) é recusada).
 */
import type { EmpresaDoPedido, TemaDoPedido } from './tipos.js';

const ITEM = {
  type: 'object',
  required: ['texto', 'fontes'],
  properties: {
    texto: { type: 'string' },
    fontes: {
      type: 'array',
      items: { type: 'object', required: ['url'], properties: { titulo: { type: 'string' }, url: { type: 'string' } } },
    },
  },
} as const;

const FAIXA = {
  type: ['object', 'null'],
  required: ['de', 'ate', 'confianca', 'fonte'],
  properties: {
    de: { type: 'number' },
    ate: { type: 'number' },
    confianca: { type: 'string', enum: ['baixa', 'media', 'alta'] },
    fonte: { type: 'string' },
  },
} as const;

const LISTA = { type: 'array', items: ITEM } as const;
const LISTAS = ['produtos', 'clientes', 'concorrentes', 'noticias'] as const;
const DO_PORTE = { funcionarios: FAIXA, faturamento: FAIXA };

const objeto = (properties: Record<string, unknown>) => ({ type: 'object', required: Object.keys(properties), properties });

export function formatoDoTema(tema: TemaDoPedido): object {
  if (tema === 'porte') return objeto(DO_PORTE);
  if (tema === 'todos') return objeto({ ...Object.fromEntries(LISTAS.map((t) => [t, LISTA])), ...DO_PORTE });
  return objeto({ [tema]: LISTA });
}

const O_QUE_TRAZER: Record<Exclude<TemaDoPedido, 'todos' | 'porte'>, string> = {
  produtos: 'produtos: o que a empresa vende (produtos, serviços, marcas);',
  clientes: 'clientes: para quem ela vende (setores, perfis e clientes citados publicamente);',
  concorrentes: 'concorrentes: com quem ela disputa mercado;',
  noticias: 'noticias: fatos dos últimos 24 meses (investimentos, expansão, contratações, prêmios, contratos com governo, mudanças de comando).',
};

const PORTE = `Porte:
- funcionarios: faixa de pessoas (de, até) se achar o número em fonte pública (LinkedIn da empresa, site, notícia), com a confiança (baixa, media ou alta) e a URL da fonte; senão, null.
- faturamento: faixa de faturamento anual em reais (de, até; número inteiro em reais, por exemplo 50000000 para R$ 50 milhões) se achar em fonte pública, com a confiança e a URL da fonte; senão, null.`;

const REGRAS = `Regras:
- Cada item precisa de ao menos uma fonte: a URL pública que você abriu e que sustenta o item. Sem fonte, não inclua o item.
- Confira que a fonte fala desta empresa (CNPJ, cidade, site); cuidado com empresas de nome parecido.
- Sobre pessoas, só o que é profissional e ligado à empresa (cargo, papel, declarações como executivo).
- Não invente. Sem nada confiável, a lista fica vazia.`;

function oQuePedir(tema: TemaDoPedido): string {
  if (tema === 'porte') return PORTE;
  const temas = tema === 'todos' ? LISTAS : [tema];
  const lista = temas.map((t, i) => `${i + 1}. ${O_QUE_TRAZER[t]}`).join('\n');
  const porte = tema === 'todos' ? `\n\n${PORTE}` : '';
  return `Traga, com até 5 itens, cada item numa frase curta:\n${lista}\n\n${REGRAS}${porte}`;
}

const linha = (rotulo: string, valor: string | null) => (valor ? `- ${rotulo}: ${valor}` : null);

function identificacao(e: EmpresaDoPedido): string {
  return [
    linha('Nome', e.nome),
    linha('Razão social', e.razaoSocial),
    linha('CNPJ', e.cnpj),
    linha('Site', e.site),
    linha('Cidade', e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade),
    linha('Ramo', e.ramo),
  ].filter(Boolean).join('\n');
}

export function pedidoAoClaude(empresa: EmpresaDoPedido, tema: TemaDoPedido): string {
  return `Você é analista comercial da Origami Lab, uma consultoria de inovação, e está estudando uma empresa brasileira antes de abordá-la. Pesquise na web e responda em português do Brasil.

Empresa:
${identificacao(empresa)}

${oQuePedir(tema)}`;
}
