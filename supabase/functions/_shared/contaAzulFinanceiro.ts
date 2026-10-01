// Leituras financeiras do Conta Azul e o mapeamento para o espelho (ADR-0044, parte 2).
// Quirks que moldam este arquivo estão em .harness/integrations/conta-azul.md.

import { ler } from "./contaAzul.ts";
import { StatusParcela, TipoParcela } from "./contaAzulTipos.ts";
import type { CentroDeCustoDaApi, ItemDaBusca, LinhaDeParcela, Origem, ParcelaDetalhada, PessoaDaApi, Rateio } from "./contaAzulTipos.ts";

const POR_PAGINA = 1000;
const BUSCA: Record<TipoParcela, string> = {
  [TipoParcela.Receita]: "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
  [TipoParcela.Despesa]: "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar",
};

/** Um enum na busca, outro na parcela por id (o spec diz PENDENTE = EM_ABERTO, QUITADO = RECEBIDO). */
const STATUS: Record<string, StatusParcela> = {
  EM_ABERTO: StatusParcela.EmAberto,
  PENDENTE: StatusParcela.EmAberto,
  RECEBIDO: StatusParcela.Quitado,
  QUITADO: StatusParcela.Quitado,
  ATRASADO: StatusParcela.Atrasado,
  RECEBIDO_PARCIAL: StatusParcela.Parcial,
  RENEGOCIADO: StatusParcela.Renegociado,
  PERDIDO: StatusParcela.Perdido,
  CANCELADO: StatusParcela.Cancelado,
};

export const normalizarStatus = (bruto: string | undefined): StatusParcela =>
  STATUS[(bruto ?? "").toUpperCase()] ?? StatusParcela.Desconhecido;

/** As datas de alteração vêm em horário de São Paulo, sem fuso. O Brasil não tem horário de verão desde 2019. */
export function deSaoPaulo(valor: string | undefined | null): string | null {
  if (!valor) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(valor)) return new Date(valor).toISOString();
  return new Date(`${valor.length === 10 ? `${valor}T00:00:00` : valor}-03:00`).toISOString();
}

/** O inverso, para os filtros `data_alteracao_de/ate`. */
export function paraSaoPaulo(instante: Date): string {
  return new Date(instante.getTime() - 3 * 3_600_000).toISOString().slice(0, 19);
}

const numero = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Só CNPJ: documento com 14 dígitos. CPF não entra no espelho (ADR-0044, item 4). */
export function soCnpj(documento: string | undefined | null): string | null {
  const digitos = (documento ?? "").replace(/\D/g, "");
  return digitos.length === 14 ? digitos : null;
}

interface PaginaDaBusca {
  itens?: ItemDaBusca[];
}

export async function listarParcelas(
  token: string,
  tipo: TipoParcela,
  filtros: Record<string, string>,
  antes: () => Promise<void>,
): Promise<ItemDaBusca[]> {
  const todas: ItemDaBusca[] = [];
  for (let pagina = 1; ; pagina++) {
    await antes(); // harness-ok: ritmo por chamada, abaixo de 10 req/s
    const resposta = await ler<PaginaDaBusca>(token, BUSCA[tipo], { // harness-ok: uma página por volta
      ...filtros,
      pagina: String(pagina),
      tamanho_pagina: String(POR_PAGINA),
    });
    const itens = resposta.itens ?? [];
    todas.push(...itens);
    if (itens.length < POR_PAGINA) return todas;
  }
}

export const lerParcela = (token: string, id: string) =>
  ler<ParcelaDetalhada>(token, `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(id)}`);

export const lerPessoa = (token: string, id: string) => ler<PessoaDaApi>(token, `/v1/pessoas/${encodeURIComponent(id)}`);

interface PaginaDeCentros {
  /** Este endpoint usa `items`, em inglês; o resto do financeiro usa `itens`. */
  items?: CentroDeCustoDaApi[];
  itens?: CentroDeCustoDaApi[];
}

export async function listarCentrosDeCusto(token: string, antes: () => Promise<void>): Promise<CentroDeCustoDaApi[]> {
  const todos: CentroDeCustoDaApi[] = [];
  for (let pagina = 1; ; pagina++) {
    await antes(); // harness-ok: ritmo por chamada
    const resposta = await ler<PaginaDeCentros>(token, "/v1/centro-de-custo", { // harness-ok: uma página por volta
      pagina: String(pagina),
      tamanho_pagina: String(POR_PAGINA),
      filtro_rapido: "TODOS",
    });
    const itens = resposta.items ?? resposta.itens ?? [];
    todos.push(...itens);
    if (itens.length < POR_PAGINA) return todos;
  }
}

const ultimaBaixa = (detalhe: ParcelaDetalhada): string | null =>
  (detalhe.baixas ?? [])
    .map((b) => b.data_pagamento?.slice(0, 10))
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1) ?? null;

const categoriasDe = (rateio: Rateio[]) =>
  rateio.map((r) => ({ id: r.id_categoria ?? null, name: r.nome_categoria ?? null, amount: numero(r.valor) }));

const centrosDe = (rateio: Rateio[]) =>
  rateio.flatMap((r) =>
    (r.rateio_centro_custo ?? []).map((c) => ({
      id: c.id_centro_custo ?? null,
      name: c.nome_centro_custo ?? null,
      amount: numero(c.valor),
      gross: numero(c.valor_bruto),
    })),
  );

const primeiro = (...valores: (string | undefined)[]) => valores.find((v) => Boolean(v)) ?? null;
const soData = (valor: string | null) => (valor ? valor.slice(0, 10) : null);

function identidade(item: ItemDaBusca, detalhe: ParcelaDetalhada, origem: Origem) {
  return {
    tenant_id: origem.tenantId,
    connection_id: origem.connectionId,
    ca_installment_id: String(detalhe.id ?? item.id),
    ca_event_id: detalhe.evento?.id ?? null,
    kind: origem.tipo,
    description: primeiro(detalhe.descricao, item.descricao),
    status: normalizarStatus(primeiro(detalhe.status, item.status) ?? undefined),
  };
}

function datas(item: ItemDaBusca, detalhe: ParcelaDetalhada) {
  return {
    due_date: soData(primeiro(detalhe.data_vencimento, item.data_vencimento)),
    competence_date: soData(primeiro(detalhe.evento?.data_competencia, item.data_competencia)),
    payment_date: ultimaBaixa(detalhe),
    ca_updated_at: deSaoPaulo(primeiro(detalhe.data_alteracao, item.data_alteracao)),
  };
}

function valores(item: ItemDaBusca, detalhe: ParcelaDetalhada) {
  const composicao = detalhe.valor_composicao ?? {};
  return {
    gross_amount: numero(composicao.valor_bruto) ?? numero(item.total),
    net_amount: numero(composicao.valor_liquido) ?? numero(detalhe.valor_total_liquido),
    paid_amount: numero(detalhe.valor_pago) ?? numero(item.pago),
    open_amount: numero(detalhe.nao_pago) ?? numero(item.nao_pago),
  };
}

function pessoaDe(item: ItemDaBusca, origem: Origem) {
  const pessoa = item.cliente ?? item.fornecedor ?? {};
  return { person_ca_id: pessoa.id ?? null, person_name: pessoa.nome ?? null, person_document: origem.documento };
}

function notaDe(detalhe: ParcelaDetalhada) {
  const fatura = detalhe.fatura ?? {};
  return {
    invoice_number: fatura.numero != null ? String(fatura.numero) : null,
    invoice_type: fatura.tipo_fatura ?? null,
    reference_code: detalhe.evento?.codigo_referencia ?? null,
  };
}

/** Junta o item da busca (pessoa) com a parcela por id (o resto) numa linha do espelho. */
export function paraLinha(item: ItemDaBusca, detalhe: ParcelaDetalhada, origem: Origem): LinhaDeParcela {
  const rateio = detalhe.evento?.rateio ?? [];
  return {
    ...identidade(item, detalhe, origem),
    ...datas(item, detalhe),
    ...valores(item, detalhe),
    ...pessoaDe(item, origem),
    ...notaDe(detalhe),
    categories: categoriasDe(rateio),
    cost_centers: centrosDe(rateio),
    synced_at: origem.agora,
    removed_at: null,
  };
}
