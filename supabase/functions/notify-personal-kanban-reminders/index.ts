// notify-personal-kanban-reminders — lembrete do Meu Kanban por Inbox, e-mail e push (ADR-0050).
// A reserva marca o card como lembrado antes do envio: entrega no máximo uma vez.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import webpush from "npm:web-push@3.6.7";
import { ehChamadaDeServico } from "../_shared/chamadaDeServico.ts";

type Supabase = SupabaseClient;

const LIMITE_POR_CHAMADA = 500;
const TITULO_MAXIMO = 120;
const PUSH_TTL_SEGUNDOS = 3600;
const APP_URL_PADRAO = "https://origamipulse.com.br";

const ResultadoPush = { enviado: "enviado", removida: "removida" } as const;
type ResultadoPush = typeof ResultadoPush[keyof typeof ResultadoPush];

const SEM_PUSH = { pushes: 0, pushRemoved: 0, pushSkipped: 0 };

interface Lembrete {
  card_id: string;
  employee_id: string;
  tenant_id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  reminder_minutes: number;
}

interface Pessoa {
  id: string;
  nome: string | null;
  email: string | null;
}

interface Inscricao {
  id: string;
  employee_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface Destinatarios {
  pessoas: Map<string, Pessoa>;
  semEmail: Set<string>;
  inscricoes: Map<string, Inscricao[]>;
}

interface Contagem {
  emails: number;
  pushes: number;
  pushRemoved: number;
  pushSkipped: number;
}

// ── Texto ─────────────────────────────────────────────────────────────────────

function truncar(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

function tituloDoLembrete(lembrete: Lembrete): string {
  return truncar(`Lembrete: ${lembrete.title}`, TITULO_MAXIMO);
}

// Prazo como a pessoa marcou (data e hora locais dela); por isso não passa por fuso.
function textoDoPrazo(lembrete: Lembrete): string {
  const [, mes, dia] = lembrete.due_date.split("-");
  const hora = lembrete.due_time?.slice(0, 5);
  return hora ? `Prazo: ${dia}/${mes} às ${hora}` : `Prazo: ${dia}/${mes}`;
}

function caminhoDoCard(lembrete: Lembrete): string {
  return `/my-kanban?card=${lembrete.card_id}`;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Leitura ───────────────────────────────────────────────────────────────────

async function reservarLembretes(supabase: Supabase): Promise<Lembrete[]> {
  const { data, error } = await supabase.rpc("claim_due_personal_kanban_reminders", { p_limit: LIMITE_POR_CHAMADA });
  if (error) throw new Error("claim_due_personal_kanban_reminders");
  return (data ?? []) as Lembrete[];
}

function cumprido<T>(resultado: PromiseSettledResult<T>): resultado is PromiseFulfilledResult<T> {
  return resultado.status === "fulfilled";
}

function exigir<T>(resposta: { data: T[] | null; error: unknown }, tabela: string): T[] {
  if (resposta.error) throw new Error(tabela);
  return resposta.data ?? [];
}

function agruparPorPessoa(inscricoes: Inscricao[]): Map<string, Inscricao[]> {
  const porPessoa = new Map<string, Inscricao[]>();
  for (const inscricao of inscricoes) {
    porPessoa.set(inscricao.employee_id, [...(porPessoa.get(inscricao.employee_id) ?? []), inscricao]);
  }
  return porPessoa;
}

async function carregarDestinatarios(supabase: Supabase, employeeIds: string[]): Promise<Destinatarios> {
  const [pessoas, preferencias, inscricoes] = await Promise.all([
    supabase.from("employees").select("id, nome, email").in("id", employeeIds),
    supabase.from("personal_kanban_settings").select("employee_id, email_reminders").in("employee_id", employeeIds),
    supabase.from("push_subscriptions").select("id, employee_id, endpoint, p256dh, auth").in("employee_id", employeeIds),
  ]);
  const listaDePreferencias = exigir<{ employee_id: string; email_reminders: boolean }>(preferencias, "personal_kanban_settings");
  return {
    pessoas: new Map(exigir<Pessoa>(pessoas, "employees").map((p) => [p.id, p])),
    // Sem linha de preferência vale a base (e-mail ligado): só quem desligou fica de fora.
    semEmail: new Set(listaDePreferencias.filter((p) => !p.email_reminders).map((p) => p.employee_id)),
    inscricoes: agruparPorPessoa(exigir<Inscricao>(inscricoes, "push_subscriptions")),
  };
}

// ── Canais ────────────────────────────────────────────────────────────────────

async function gravarNoInbox(supabase: Supabase, lembretes: Lembrete[]): Promise<number> {
  const linhas = lembretes.map((lembrete) => ({
    tenant_id: lembrete.tenant_id,
    recipient_id: lembrete.employee_id,
    type: "personal_kanban_reminder",
    category: "lembrete",
    priority: "normal",
    action_type: "navigate",
    action_url: caminhoDoCard(lembrete),
    reference_id: lembrete.card_id,
    title: tituloDoLembrete(lembrete),
    message: textoDoPrazo(lembrete),
    metadata: { card_id: lembrete.card_id, due_date: lembrete.due_date, due_time: lembrete.due_time },
    is_read: false,
    is_resolved: false,
  }));
  const { error } = await supabase.from("notifications").insert(linhas);
  if (error) throw new Error("notifications");
  return linhas.length;
}

function htmlDoEmail(lembrete: Lembrete, pessoa: Pessoa, link: string): string {
  const saudacao = pessoa.nome ? `Olá, ${escaparHtml(pessoa.nome.split(" ")[0])}.` : "Olá.";
  return `<!DOCTYPE html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#f7f7f2;font-family:Inter,Arial,sans-serif;color:#252525">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #dcdcd0;border-radius:12px;padding:24px">
    <p style="margin:0 0 16px;font-size:14px;color:#6b6b62">${saudacao} Você pediu para ser lembrado(a) disto:</p>
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;line-height:1.4">${escaparHtml(lembrete.title)}</p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6b62">${escaparHtml(textoDoPrazo(lembrete))}</p>
    <a href="${link}" style="display:inline-block;background:#0e895d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px">Abrir card</a>
    <p style="margin:24px 0 0;font-size:12px;color:#8a8a80">Para não receber lembretes por e-mail, desligue a opção em Meu Kanban → Configurar.</p>
  </div>
</body></html>`;
}

async function enviarEmails(destinatarios: Destinatarios, lembretes: Lembrete[]): Promise<number> {
  const chave = Deno.env.get("RESEND_API_KEY");
  if (!chave) return 0;
  const resend = new Resend(chave);
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "Origami Pulse <noreply@resend.dev>";
  const appUrl = Deno.env.get("APP_URL") ?? APP_URL_PADRAO;

  const envios = lembretes.flatMap((lembrete) => {
    const pessoa = destinatarios.pessoas.get(lembrete.employee_id);
    if (!pessoa?.email || destinatarios.semEmail.has(lembrete.employee_id)) return [];
    const html = htmlDoEmail(lembrete, pessoa, `${appUrl}${caminhoDoCard(lembrete)}`);
    return [resend.emails.send({ from, to: [pessoa.email], subject: tituloDoLembrete(lembrete), html })];
  });
  const resultados = await Promise.allSettled(envios);
  return resultados.filter((r) => cumprido(r) && !r.value.error).length;
}

function vapidConfigurado(): boolean {
  const publica = Deno.env.get("VAPID_PUBLIC_KEY");
  const privada = Deno.env.get("VAPID_PRIVATE_KEY");
  const assunto = Deno.env.get("VAPID_SUBJECT");
  if (!publica || !privada || !assunto) return false;
  webpush.setVapidDetails(assunto, publica, privada);
  return true;
}

// Inscrição que o navegador revogou (404/410) não volta: sai da tabela.
async function enviarUmPush(supabase: Supabase, inscricao: Inscricao, payload: string): Promise<ResultadoPush> {
  const alvo = { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } };
  try {
    await webpush.sendNotification(alvo, payload, { TTL: PUSH_TTL_SEGUNDOS });
    await supabase.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", inscricao.id);
    return ResultadoPush.enviado;
  } catch (erro) {
    const status = (erro as { statusCode?: number }).statusCode;
    if (status !== 404 && status !== 410) throw erro;
    await supabase.from("push_subscriptions").delete().eq("id", inscricao.id);
    return ResultadoPush.removida;
  }
}

async function enviarPushes(supabase: Supabase, destinatarios: Destinatarios, lembretes: Lembrete[]): Promise<Omit<Contagem, "emails">> {
  const envios = lembretes.flatMap((lembrete) => {
    const payload = JSON.stringify({
      title: tituloDoLembrete(lembrete),
      body: textoDoPrazo(lembrete),
      url: caminhoDoCard(lembrete),
      tag: lembrete.card_id,
    });
    return (destinatarios.inscricoes.get(lembrete.employee_id) ?? []).map((inscricao) => ({ inscricao, payload }));
  });
  if (envios.length === 0) return SEM_PUSH;
  if (!vapidConfigurado()) return { pushes: 0, pushRemoved: 0, pushSkipped: envios.length };

  const resultados = await Promise.allSettled(envios.map(({ inscricao, payload }) => enviarUmPush(supabase, inscricao, payload)));
  const contar = (esperado: ResultadoPush) => resultados.filter((r) => cumprido(r) && r.value === esperado).length;
  return { pushes: contar(ResultadoPush.enviado), pushRemoved: contar(ResultadoPush.removida), pushSkipped: 0 };
}

// ── Orquestração ──────────────────────────────────────────────────────────────

function motivosDeFalha(resultados: PromiseSettledResult<unknown>[]): string[] {
  return resultados.filter((r): r is PromiseRejectedResult => !cumprido(r)).map((r) => (r.reason as Error).message);
}

async function lembrar(supabase: Supabase) {
  const lembretes = await reservarLembretes(supabase);
  if (lembretes.length === 0) return { claimed: 0, inbox: 0, emails: 0, ...SEM_PUSH };

  const destinatarios = await carregarDestinatarios(supabase, [...new Set(lembretes.map((l) => l.employee_id))]);
  const [inbox, emails, pushes] = await Promise.allSettled([
    gravarNoInbox(supabase, lembretes),
    enviarEmails(destinatarios, lembretes),
    enviarPushes(supabase, destinatarios, lembretes),
  ]);
  const falhas = motivosDeFalha([inbox, emails, pushes]);
  return {
    claimed: lembretes.length,
    inbox: cumprido(inbox) ? inbox.value : 0,
    emails: cumprido(emails) ? emails.value : 0,
    ...(cumprido(pushes) ? pushes.value : SEM_PUSH),
    ...(falhas.length > 0 ? { falhas } : {}),
  };
}

// ── Entrada ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST.", { status: 405 });
  if (!(await ehChamadaDeServico(req))) return new Response("Não autorizado.", { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const inicio = Date.now();
  try {
    // Rastro da automação (patterns/monitoring.md): só contagens — nada de título, e-mail ou endpoint.
    const resumo = { evento: "notify-personal-kanban-reminders", status: "ok", ...(await lembrar(supabase)), ms: Date.now() - inicio };
    console.log(JSON.stringify(resumo));
    return new Response(JSON.stringify(resumo), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (erro) {
    console.error(JSON.stringify({ evento: "notify-personal-kanban-reminders", status: "erro", etapa: (erro as Error).message }));
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
