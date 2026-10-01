// Motor da sincronização Conta Azul → espelho (ADR-0044, parte 2): carga inicial mês a mês,
// incremental pelas alterações e varredura diária, que refaz o que faltou e marca o que sumiu.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FalhaContaAzul } from "./contaAzul.ts";
import { marcarReconectar, tokenDeAcesso } from "./contaAzulConexao.ts";
import {
  deSaoPaulo,
  lerParcela,
  lerPessoa,
  listarCentrosDeCusto,
  listarParcelas,
  paraLinha,
  paraSaoPaulo,
  soCnpj,
} from "./contaAzulFinanceiro.ts";
import { MotivoFalha, SituacaoDaSincronizacao, TipoParcela } from "./contaAzulTipos.ts";
import type { ConexaoParaSincronizar, ItemDaBusca, LinhaDeParcela, ResumoDaSincronizacao } from "./contaAzulTipos.ts";

/** Abaixo dos 10 req/s por conta conectada que o Conta Azul aceita. */
const POR_SEGUNDO = 8;
const LARGURA = 4;
const LOTE = 100;
const FATIA_DO_IN = 200;
const MARGEM_DO_INCREMENTAL_MS = 10 * 60_000;
const VARREDURA_A_CADA_MS = 20 * 3_600_000;
/** O filtro de alteração aceita no máximo 365 dias. */
const ALTERACAO_MAXIMA_MS = 364 * 86_400_000;
const MESES_A_FRENTE = 12;
const TIPOS = [TipoParcela.Receita, TipoParcela.Despesa];
const ESPELHO = "conta_azul_installments";

interface Contexto {
  admin: SupabaseClient;
  conexao: ConexaoParaSincronizar;
  token: string;
  inicio: Date;
  prazo: number;
  ritmo: () => Promise<void>;
  documentos: Map<string, Promise<string | null>>;
  pendentes: LinhaDeParcela[];
  atualizadas: number;
  recusadas: number;
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const temTempo = (ctx: Contexto) => Date.now() < ctx.prazo;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarMeses = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const ultimoDia = (d: Date) => iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
const fimDaJanela = (agora: Date) => somarMeses(agora, MESES_A_FRENTE);

/** Desde 1º de janeiro do ano anterior à conexão — para a Origami, 01/01/2025 (ADR-0044, 7a). */
const inicioDaCarga = (conexao: ConexaoParaSincronizar) =>
  new Date(Date.UTC(new Date(conexao.connected_at).getUTCFullYear() - 1, 0, 1));

function criarRitmo(porSegundo: number): () => Promise<void> {
  const intervalo = 1000 / porSegundo;
  let proxima = 0;
  return async () => {
    const agora = Date.now();
    const vez = Math.max(agora, proxima);
    proxima = vez + intervalo;
    if (vez > agora) await esperar(vez - agora);
  };
}

function fatiar<T>(itens: T[], tamanho: number): T[][] {
  const fatias: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) fatias.push(itens.slice(i, i + tamanho));
  return fatias;
}

const ehRecusa = (erro: unknown) => erro instanceof FalhaContaAzul && erro.motivo === MotivoFalha.Recusado;

function falhaDoBanco(acao: string): FalhaContaAzul {
  return new FalhaContaAzul(MotivoFalha.Indisponivel, `Não foi possível ${acao}.`);
}

/** Roda a tarefa em `largura` filas; para de puxar item novo quando o tempo acaba. */
async function emParalelo<T>(itens: T[], largura: number, tarefa: (item: T) => Promise<void>, continuar: () => boolean): Promise<boolean> {
  let proximo = 0;
  let interrompido = false;
  const fila = async () => {
    while (proximo < itens.length) {
      if (!continuar()) {
        interrompido = true;
        return;
      }
      await tarefa(itens[proximo++]); // harness-ok: cada volta é um item diferente
    }
  };
  await Promise.all(Array.from({ length: largura }, fila));
  return !interrompido;
}

async function atualizarConexao(ctx: Contexto, campos: Record<string, unknown>): Promise<void> {
  const { error } = await ctx.admin.from("conta_azul_connections").update(campos).eq("id", ctx.conexao.id);
  if (error) throw falhaDoBanco("gravar o andamento da sincronização");
  Object.assign(ctx.conexao, campos);
}

async function resolverDocumento(ctx: Contexto, pessoaId: string): Promise<string | null> {
  const { data } = await ctx.admin
    .from("conta_azul_people")
    .select("document")
    .eq("connection_id", ctx.conexao.id)
    .eq("ca_person_id", pessoaId)
    .maybeSingle();
  if (data) return (data.document as string | null) ?? null;
  await ctx.ritmo();
  const pessoa = await lerPessoa(ctx.token, pessoaId).catch((erro) => {
    if (ehRecusa(erro)) return null;
    throw erro;
  });
  const documento = soCnpj(pessoa?.documento);
  await ctx.admin.from("conta_azul_people").upsert({
    connection_id: ctx.conexao.id,
    ca_person_id: pessoaId,
    name: pessoa?.nome ?? null,
    document: documento,
    fetched_at: new Date().toISOString(),
  });
  return documento;
}

/** Uma consulta por pessoa por execução, mesmo com várias filas pedindo ao mesmo tempo. */
function documentoDe(ctx: Contexto, pessoaId: string | undefined): Promise<string | null> {
  if (!pessoaId) return Promise.resolve(null);
  let pedido = ctx.documentos.get(pessoaId);
  if (!pedido) {
    pedido = resolverDocumento(ctx, pessoaId);
    ctx.documentos.set(pessoaId, pedido);
  }
  return pedido;
}

async function gravarPendentes(ctx: Contexto): Promise<void> {
  const lote = ctx.pendentes.splice(0);
  if (lote.length === 0) return;
  const { error } = await ctx.admin.from(ESPELHO).upsert(lote, { onConflict: "connection_id,ca_installment_id" });
  if (error) throw falhaDoBanco("gravar as parcelas do Conta Azul");
  ctx.atualizadas += lote.length;
}

async function sincronizarItem(ctx: Contexto, tipo: TipoParcela, item: ItemDaBusca): Promise<void> {
  try {
    await ctx.ritmo();
    const detalhe = await lerParcela(ctx.token, String(item.id));
    const documento = await documentoDe(ctx, (item.cliente ?? item.fornecedor)?.id);
    const origem = { tenantId: ctx.conexao.tenant_id, connectionId: ctx.conexao.id, tipo, documento, agora: new Date().toISOString() };
    ctx.pendentes.push(paraLinha(item, detalhe, origem));
    if (ctx.pendentes.length >= LOTE) await gravarPendentes(ctx);
  } catch (erro) {
    if (!ehRecusa(erro)) throw erro;
    ctx.recusadas += 1;
  }
}

/** Só relê o detalhe do que mudou desde a última leitura (ou que tinha sumido e voltou). */
async function filtrarDesatualizados(ctx: Contexto, itens: ItemDaBusca[]): Promise<ItemDaBusca[]> {
  const conhecidos = new Map<string, string | null>();
  for (const fatia of fatiar(itens.map((i) => String(i.id)), FATIA_DO_IN)) {
    const { data, error } = await ctx.admin
      .from(ESPELHO)
      .select("ca_installment_id, ca_updated_at, removed_at")
      .eq("connection_id", ctx.conexao.id)
      .in("ca_installment_id", fatia);
    if (error) throw falhaDoBanco("ler o espelho do Conta Azul");
    for (const r of data ?? []) conhecidos.set(r.ca_installment_id, r.removed_at ? null : r.ca_updated_at);
  }
  return itens.filter((item) => {
    const lido = conhecidos.get(String(item.id));
    const alterado = deSaoPaulo(item.data_alteracao);
    return !lido || !alterado || new Date(alterado) > new Date(lido);
  });
}

async function processarItens(ctx: Contexto, tipo: TipoParcela, itens: ItemDaBusca[]): Promise<boolean> {
  const desatualizados = await filtrarDesatualizados(ctx, itens);
  const completo = await emParalelo(desatualizados, LARGURA, (item) => sincronizarItem(ctx, tipo, item), () => temTempo(ctx));
  await gravarPendentes(ctx);
  return completo;
}

async function sincronizarMes(ctx: Contexto, mes: Date, vistos?: Set<string>): Promise<boolean> {
  for (const tipo of TIPOS) {
    const filtros = { data_vencimento_de: iso(mes), data_vencimento_ate: ultimoDia(mes) };
    const itens = await listarParcelas(ctx.token, tipo, filtros, ctx.ritmo); // harness-ok: um tipo por volta
    itens.forEach((item) => vistos?.add(String(item.id)));
    if (!(await processarItens(ctx, tipo, itens))) return false; // harness-ok: um tipo por volta
  }
  return true;
}

async function sincronizarCentros(ctx: Contexto): Promise<void> {
  const centros = await listarCentrosDeCusto(ctx.token, ctx.ritmo);
  if (centros.length === 0) return;
  const agora = new Date().toISOString();
  const linhas = centros.map((c) => ({
    tenant_id: ctx.conexao.tenant_id,
    connection_id: ctx.conexao.id,
    ca_cost_center_id: String(c.id),
    code: c.codigo ?? null,
    name: c.nome ?? "Sem nome no Conta Azul",
    is_active: c.ativo ?? true,
    synced_at: agora,
  }));
  // Sem `cost_center_id` no corpo: o upsert preserva a ligação que o admin fez.
  const { error } = await ctx.admin.from("conta_azul_cost_centers").upsert(linhas, { onConflict: "connection_id,ca_cost_center_id" });
  if (error) throw falhaDoBanco("gravar os centros de custo do Conta Azul");
}

async function avancarCargaInicial(ctx: Contexto): Promise<void> {
  if (!ctx.conexao.incremental_cursor) await atualizarConexao(ctx, { incremental_cursor: ctx.inicio.toISOString() });
  const fim = fimDaJanela(ctx.inicio);
  let mes = ctx.conexao.backfill_cursor ? new Date(`${ctx.conexao.backfill_cursor}T00:00:00Z`) : inicioDaCarga(ctx.conexao);
  while (mes <= fim && temTempo(ctx)) {
    if (!(await sincronizarMes(ctx, mes))) return; // harness-ok: um mês por volta; incompleto retoma o mesmo mês
    mes = somarMeses(mes, 1);
    await atualizarConexao(ctx, { backfill_cursor: iso(mes) }); // harness-ok: grava o avanço a cada mês
  }
  if (mes > fim) {
    await atualizarConexao(ctx, { backfill_done_at: ctx.inicio.toISOString(), last_full_scan_at: ctx.inicio.toISOString() });
  }
}

/** Uma janela de vencimento por ano: a API exige o filtro e não documenta o tamanho máximo. */
function janelasAnuais(ctx: Contexto): { de: string; ate: string }[] {
  const janelas: { de: string; ate: string }[] = [];
  const fim = fimDaJanela(ctx.inicio);
  for (let ano = inicioDaCarga(ctx.conexao).getUTCFullYear(); ano <= fim.getUTCFullYear(); ano++) {
    janelas.push({ de: `${ano}-01-01`, ate: `${ano}-12-31` });
  }
  return janelas;
}

async function lerAlteracoes(ctx: Contexto): Promise<void> {
  const cursor = new Date(ctx.conexao.incremental_cursor ?? ctx.inicio.toISOString()).getTime();
  const desde = new Date(Math.max(cursor - MARGEM_DO_INCREMENTAL_MS, ctx.inicio.getTime() - ALTERACAO_MAXIMA_MS));
  const alteracao = { data_alteracao_de: paraSaoPaulo(desde), data_alteracao_ate: paraSaoPaulo(ctx.inicio) };
  for (const janela of janelasAnuais(ctx)) {
    for (const tipo of TIPOS) {
      const filtros = { ...alteracao, data_vencimento_de: janela.de, data_vencimento_ate: janela.ate };
      const itens = await listarParcelas(ctx.token, tipo, filtros, ctx.ritmo); // harness-ok: uma janela e um tipo por volta
      if (!(await processarItens(ctx, tipo, itens))) return; // harness-ok: idem
    }
  }
  await atualizarConexao(ctx, { incremental_cursor: ctx.inicio.toISOString() });
}

async function idsNoEspelho(ctx: Contexto): Promise<string[]> {
  const ids: string[] = [];
  const fim = fimDaJanela(ctx.inicio);
  for (let de = 0; ; de += 1000) {
    const { data, error } = await ctx.admin
      .from(ESPELHO)
      .select("ca_installment_id")
      .eq("connection_id", ctx.conexao.id)
      .is("removed_at", null)
      .gte("due_date", iso(inicioDaCarga(ctx.conexao)))
      .lte("due_date", ultimoDia(fim))
      .order("ca_installment_id")
      .range(de, de + 999); // harness-ok: paginação, uma página por volta
    if (error) throw falhaDoBanco("ler o espelho do Conta Azul");
    ids.push(...(data ?? []).map((r) => r.ca_installment_id as string));
    if (!data || data.length < 1000) return ids;
  }
}

async function marcarRemovidas(ctx: Contexto, vistos: Set<string>): Promise<void> {
  const sumidas = (await idsNoEspelho(ctx)).filter((id) => !vistos.has(id));
  for (const fatia of fatiar(sumidas, FATIA_DO_IN)) {
    const { error } = await ctx.admin
      .from(ESPELHO)
      .update({ removed_at: ctx.inicio.toISOString() })
      .eq("connection_id", ctx.conexao.id)
      .in("ca_installment_id", fatia); // harness-ok: uma fatia por volta
    if (error) throw falhaDoBanco("marcar as parcelas removidas no Conta Azul");
  }
}

/** Só marca como removida se varreu a janela inteira: varredura pela metade não prova sumiço. */
async function varrerSeVencido(ctx: Contexto): Promise<void> {
  const ultima = ctx.conexao.last_full_scan_at;
  if (ultima && ctx.inicio.getTime() - new Date(ultima).getTime() < VARREDURA_A_CADA_MS) return;
  const vistos = new Set<string>();
  const fim = fimDaJanela(ctx.inicio);
  for (let mes = inicioDaCarga(ctx.conexao); mes <= fim; mes = somarMeses(mes, 1)) {
    if (!temTempo(ctx) || !(await sincronizarMes(ctx, mes, vistos))) return; // harness-ok: um mês por volta
  }
  await marcarRemovidas(ctx, vistos);
  await atualizarConexao(ctx, { last_full_scan_at: ctx.inicio.toISOString() });
}

async function contar(ctx: Contexto, tipo: TipoParcela): Promise<number> {
  const { count } = await ctx.admin
    .from(ESPELHO)
    .select("id", { count: "exact", head: true })
    .eq("connection_id", ctx.conexao.id)
    .eq("kind", tipo)
    .is("removed_at", null);
  return count ?? 0;
}

async function executar(ctx: Contexto): Promise<void> {
  await sincronizarCentros(ctx);
  if (!ctx.conexao.backfill_done_at) return avancarCargaInicial(ctx);
  await lerAlteracoes(ctx);
  await varrerSeVencido(ctx);
}

/** Casa as parcelas de receita e aplica a baixa do casamento forte (ADR-0044, parte 3). */
async function conciliarReceber(ctx: Contexto): Promise<void> {
  const { error } = await ctx.admin.rpc("conta_azul_reconcile_receivables", { p_tenant_id: ctx.conexao.tenant_id });
  if (error) throw falhaDoBanco("conciliar as contas a receber");
}

async function concluir(ctx: Contexto): Promise<void> {
  await conciliarReceber(ctx);
  await atualizarConexao(ctx, {
    last_sync_at: new Date().toISOString(),
    last_error: null,
    receivable_count: await contar(ctx, TipoParcela.Receita),
    payable_count: await contar(ctx, TipoParcela.Despesa),
  });
}

function mensagemDe(erro: unknown): string {
  if (erro instanceof FalhaContaAzul) return erro.message;
  if (erro instanceof DOMException) return "O Conta Azul demorou demais para responder. A próxima sincronização tenta de novo.";
  // Só o nome: a mensagem crua pode trazer corpo de resposta.
  console.error("conta-azul-sync: falha inesperada", (erro as Error)?.name);
  return "A sincronização falhou por um erro inesperado. A próxima tenta de novo.";
}

async function registrarErro(admin: SupabaseClient, connectionId: string, erro: unknown): Promise<void> {
  const mensagem = mensagemDe(erro);
  if (erro instanceof FalhaContaAzul && erro.motivo === MotivoFalha.Reconectar) {
    await marcarReconectar(admin, connectionId, mensagem);
    return;
  }
  await admin.from("conta_azul_connections").update({ last_error: mensagem }).eq("id", connectionId);
}

async function pegarTrava(admin: SupabaseClient, connectionId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("conta_azul_claim_sync", { p_connection_id: connectionId });
  return !error && data === true;
}

export async function sincronizarConexao(admin: SupabaseClient, conexao: ConexaoParaSincronizar, prazo: number): Promise<ResumoDaSincronizacao> {
  if (!(await pegarTrava(admin, conexao.id))) {
    return { situacao: SituacaoDaSincronizacao.EmAndamento, atualizadas: 0, recusadas: 0 };
  }
  const ctx: Partial<Contexto> = { atualizadas: 0, recusadas: 0 };
  try {
    Object.assign(ctx, {
      admin,
      conexao: { ...conexao },
      token: await tokenDeAcesso(admin, conexao.id),
      inicio: new Date(),
      prazo,
      ritmo: criarRitmo(POR_SEGUNDO),
      documentos: new Map(),
      pendentes: [],
    });
    await executar(ctx as Contexto);
    await concluir(ctx as Contexto);
    return { situacao: SituacaoDaSincronizacao.Concluida, atualizadas: ctx.atualizadas ?? 0, recusadas: ctx.recusadas ?? 0 };
  } catch (erro) {
    await registrarErro(admin, conexao.id, erro);
    return { situacao: SituacaoDaSincronizacao.Erro, atualizadas: ctx.atualizadas ?? 0, recusadas: ctx.recusadas ?? 0 };
  } finally {
    await admin.from("conta_azul_connections").update({ syncing_until: null }).eq("id", conexao.id);
  }
}
