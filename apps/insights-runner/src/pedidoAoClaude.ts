/**
 * O que o runner pede ao Claude (US-0057): os quatro temas, cada item com fonte, e a proposta de
 * porte. A regra do ADR-0054 vai no pedido e volta a ser conferida no banco (item sem fonte não
 * fica; proposta sem fonte http(s) é recusada).
 */

import type { EmpresaDoPedido } from './tipos.js';

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

export const FORMATO_DA_RESPOSTA = {
  type: 'object',
  required: ['produtos', 'clientes', 'concorrentes', 'noticias', 'funcionarios', 'faturamento'],
  properties: { produtos: LISTA, clientes: LISTA, concorrentes: LISTA, noticias: LISTA, funcionarios: FAIXA, faturamento: FAIXA },
} as const;

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

export function pedidoAoClaude(empresa: EmpresaDoPedido): string {
  return `Você é analista comercial da Origami Lab, uma consultoria de inovação, e está estudando uma empresa brasileira antes de abordá-la. Pesquise na web e responda em português do Brasil.

Empresa:
${identificacao(empresa)}

Traga, com até 5 itens por tema, cada item numa frase curta:
1. produtos: o que a empresa vende (produtos, serviços, marcas);
2. clientes: para quem ela vende (setores, perfis e clientes citados publicamente);
3. concorrentes: com quem ela disputa mercado;
4. noticias: fatos dos últimos 24 meses (investimentos, expansão, contratações, prêmios, contratos com governo, mudanças de comando).

Regras:
- Cada item precisa de ao menos uma fonte: a URL pública que você abriu e que sustenta o item. Sem fonte, não inclua o item.
- Confira que a fonte fala desta empresa (CNPJ, cidade, site); cuidado com empresas de nome parecido.
- Sobre pessoas, só o que é profissional e ligado à empresa (cargo, papel, declarações como executivo).
- Não invente. Tema sem nada confiável fica com a lista vazia.

Porte:
- funcionarios: faixa de pessoas (de, até) se achar o número em fonte pública (LinkedIn da empresa, site, notícia), com a confiança (baixa, media ou alta) e a URL da fonte; senão, null.
- faturamento: faixa de faturamento anual em reais (de, até; número inteiro em reais, por exemplo 50000000 para R$ 50 milhões) se achar em fonte pública, com a confiança e a URL da fonte; senão, null.`;
}
