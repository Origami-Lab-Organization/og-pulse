// Importa empresas por CNPJ num tenant pelo mesmo caminho do "Importar CNPJs" da tela.
// Uso e regras: .harness/integrations/fomento-publico.md (Listas-alvo). Sem --aplicar, simula.

import { readFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { receitaFromBrasilApi, type ReceitaSnapshot, type RespostaBrasilApi } from '../supabase/functions/_shared/receita';
import { montarSinais, operacoesBndes, type LinhaDeReferencia } from '../supabase/functions/_shared/fomento';

const PAUSA_MS = 400;
const args = process.argv.slice(2);
const opcao = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const aplicar = args.includes('--aplicar');
// Só recalcula o fomento das empresas do arquivo que já estão no tenant (nada de Receita).
const soFomento = args.includes('--so-fomento');
// --porte DEMAIS = só médias e grandes (a Receita não separa as duas; micro e pequena ficam fora).
const portes = opcao('porte')?.split(',').map((p) => p.trim().toUpperCase());
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cnpjsDoArquivo(texto: string): string[] {
  const achados = texto.match(/(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g) ?? [];
  return [...new Set(achados.map((c) => c.replace(/\D/g, '')))];
}

async function consultar(cnpj: string): Promise<ReceitaSnapshot> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; OrigamiPulse/1.0; +https://origamipulse.com.br)' },
  });
  if (!resposta.ok) throw new Error(`Receita respondeu ${resposta.status}`);
  return receitaFromBrasilApi((await resposta.json()) as RespostaBrasilApi);
}

function cliente(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para --aplicar.');
  return createClient(url, chave, { auth: { persistSession: false } });
}

async function existentes(supabase: SupabaseClient, tenant: string, cnpjs: string[]): Promise<Set<string>> {
  const { data, error } = await supabase.from('prospect_companies').select('cnpj').eq('tenant_id', tenant).in('cnpj', cnpjs);
  if (error) throw new Error(`leitura de empresas: ${error.message}`);
  return new Set((data ?? []).map((e: { cnpj: string }) => e.cnpj));
}

let temLeiDoBem: boolean | null = null;

/** O mesmo cruzamento do botão "Consultar" (company-funding-check), sem o Portal da Transparência. */
async function gravarFomento(supabase: SupabaseClient, companyId: string, cnpj: string): Promise<void> {
  if (temLeiDoBem === null) {
    const { count } = await supabase.from('fomento_publico').select('id', { count: 'exact', head: true }).eq('fonte', 'lei_do_bem');
    temLeiDoBem = (count ?? 0) > 0;
  }
  const [{ data: referencia }, bndes] = await Promise.all([
    supabase.from('fomento_publico').select('fonte, ano, valor, instrumento, descricao').eq('cnpj', cnpj).limit(200),
    operacoesBndes(cnpj).catch(() => []),
  ]);
  const fomento = montarSinais((referencia ?? []) as LinhaDeReferencia[], temLeiDoBem, bndes, null);
  const { error } = await supabase
    .from('prospect_companies')
    .update({ fomento, fomento_consultado_em: new Date().toISOString() })
    .eq('id', companyId);
  if (error) throw new Error(`fomento: ${error.message}`);
}

async function gravar(supabase: SupabaseClient, tenant: string, cnpj: string, receita: ReceitaSnapshot): Promise<void> {
  const origem = opcao('origem');
  const { data: empresa, error } = await supabase
    .from('prospect_companies')
    .insert({
      tenant_id: tenant,
      name: receita.nomeFantasia ?? receita.razaoSocial,
      cnpj,
      segment: receita.segmento,
      notes: origem ? `Origem da lista: ${origem}` : null,
      created_by: opcao('criado-por') ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const { error: erroReceita } = await supabase.rpc('save_prospect_company_receita', {
    p_company_id: empresa.id,
    p_receita: receita,
  });
  if (erroReceita) throw new Error(`receita: ${erroReceita.message}`);
  await gravarFomento(supabase, empresa.id, cnpj);
}

type Desfecho = 'criadas' | 'foraDoPorte' | 'falhas';

async function processar(supabase: SupabaseClient | null, tenant: string, cnpj: string, n: number): Promise<Desfecho> {
  try {
    const receita = await consultar(cnpj);
    if (portes && !portes.includes((receita.porte ?? '').toUpperCase())) {
      console.log(`${n}. fora do porte: ${receita.nomeFantasia ?? receita.razaoSocial} (${receita.porte ?? 'sem porte'})`);
      return 'foraDoPorte';
    }
    if (supabase) await gravar(supabase, tenant, cnpj, receita);
    const regime = receita.regimeTributario ?? 'regime não informado';
    console.log(`${n}. ${receita.nomeFantasia ?? receita.razaoSocial} · ${receita.porte ?? '-'} · ${regime} · ${receita.socios.length} sócios`);
    return 'criadas';
  } catch (erro) {
    console.log(`${n}. falhou ${cnpj}: ${(erro as Error).message}`);
    return 'falhas';
  }
}

async function recalcularFomento(supabase: SupabaseClient, tenant: string, cnpjs: string[]): Promise<void> {
  const { data, error } = await supabase.from('prospect_companies').select('id, cnpj, name').eq('tenant_id', tenant).in('cnpj', cnpjs);
  if (error) throw new Error(`leitura de empresas: ${error.message}`);
  let feitas = 0;
  for (const empresa of data ?? []) {
    await gravarFomento(supabase, empresa.id, empresa.cnpj).catch((e) => console.log(`falhou ${empresa.name}: ${(e as Error).message}`)); // harness-ok: uma empresa por volta
    feitas += 1;
    process.stdout.write(`\r  fomento ${feitas} de ${data?.length ?? 0}`);
  }
  console.log('\nfomento recalculado.');
}

async function principal() {
  const arquivo = opcao('arquivo');
  const tenant = opcao('tenant');
  if (!arquivo || !tenant) throw new Error('Use --arquivo <lote.txt> --tenant <tenant_id>.');
  const cnpjs = cnpjsDoArquivo(await readFile(arquivo, 'utf8'));
  const supabase = aplicar ? cliente() : null;
  if (soFomento) {
    if (!supabase) throw new Error('--so-fomento exige --aplicar.');
    return recalcularFomento(supabase, tenant, cnpjs);
  }
  const jaTem = supabase ? await existentes(supabase, tenant, cnpjs) : new Set<string>();
  const fila = cnpjs.filter((c) => !jaTem.has(c));
  console.log(`${cnpjs.length} CNPJs no arquivo · ${jaTem.size} já no tenant · ${fila.length} a importar.`);

  const resumo: Record<Desfecho, number> = { criadas: 0, foraDoPorte: 0, falhas: 0 };
  for (const [i, cnpj] of fila.entries()) {
    resumo[await processar(supabase, tenant, cnpj, i + 1)] += 1; // harness-ok: um CNPJ diferente a cada volta
    await esperar(PAUSA_MS); // harness-ok: pausa proposital (limite da BrasilAPI)
  }
  console.log(`\n${aplicar ? 'gravado' : 'simulação — nada gravado'}:`, { ...resumo, jaExistiam: jaTem.size });
}

principal().catch((e) => {
  console.error('erro:', (e as Error).message);
  process.exit(1);
});
