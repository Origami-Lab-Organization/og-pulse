import { etapaDaOportunidade, statusDoProjeto } from '@/lib/prospecting/relacao';
import { emTitulo, reaisCurtos } from '@/lib/prospecting/empresasReceita';
import { sociosParaTrazer } from '@/lib/prospecting/estudoDaConta';
import { cargoNaEmpresa, nomeDaQualificacao } from '@/lib/prospecting/qualificacoesDeSocio';
import { getDiscardReasonLabel, type ProspectCompanyDB, type ProspectContactDB, type ProspectOpportunityContact, type ProspectWithCompany } from '@/types/prospect';
import type { ProspectCompanyPartnerDB } from '@/types/receita';
import type { EmpresaDaFicha, SocioDaFicha } from '@/types/fichaReceita';
import type { DadosDaRelacao, OportunidadeDaRelacao, ProjetoDaRelacao } from '@/types/relacao';
import type { ContatoDaPessoa, EventoDoHistorico, ItemDeRisco, NumerosDoHistorico, PassoDoWidget, PessoaDaEmpresa } from '@/types/paginaDaEmpresa';
import {
  CAMPO_DA_EMPRESA,
  ETAPA_GANHO,
  ETAPA_PERDA,
  FATURAMENTO_DA_BASE,
  ORIGEM_DA_PESSOA,
  PASSO_DA_QUALIFICACAO,
  SECAO_DA_EMPRESA,
  TAMANHO_MINIMO_DA_SINTESE,
  TIPO_DE_EVENTO,
} from './faseDaEmpresa.constants';

/**
 * Regras da página da empresa (US-0053): os passos da qualificação, o histórico com a Origami e
 * os riscos. Os passos só orientam; quem decide criar a Oportunidade é quem estudou a empresa.
 */

const DECISOR = 'decisor';

export function sinteseEscrita(notas: string | null | undefined): boolean {
  return (notas ?? '').trim().length >= TAMANHO_MINIMO_DA_SINTESE;
}

/** O faturamento veio do time (estimado ou apurado), não do cálculo da Base guardado ao mover. */
export function faturamentoDoTime(base: string | null | undefined): boolean {
  return !!base && base !== FATURAMENTO_DA_BASE;
}

/** "250" para R$ 250 mi: o valor como se digita no campo de faturamento. */
export function emMilhoes(reais: number): string {
  return (reais / MILHAO).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function passosDaQualificacao(empresa: ProspectCompanyDB, oportunidade: ProspectWithCompany): PassoDoWidget[] {
  const temDecisor = (oportunidade.contacts ?? []).some((c) => c.role === DECISOR);
  return [
    { chave: PASSO_DA_QUALIFICACAO.SITE, rotulo: 'Site informado', feito: !!empresa.website, campo: CAMPO_DA_EMPRESA.SITE, secao: SECAO_DA_EMPRESA.CANAIS },
    { chave: PASSO_DA_QUALIFICACAO.LINKEDIN, rotulo: 'LinkedIn informado', feito: !!empresa.linkedin_url, campo: CAMPO_DA_EMPRESA.LINKEDIN, secao: SECAO_DA_EMPRESA.CANAIS },
    { chave: PASSO_DA_QUALIFICACAO.DECISOR, rotulo: 'Decisor mapeado', feito: temDecisor, campo: null, secao: SECAO_DA_EMPRESA.PESSOAS },
    { chave: PASSO_DA_QUALIFICACAO.FATURAMENTO, rotulo: 'Faturamento informado', feito: empresa.faturamento_anual != null && faturamentoDoTime(empresa.faturamento_anual_base), campo: CAMPO_DA_EMPRESA.FATURAMENTO, secao: null },
    { chave: PASSO_DA_QUALIFICACAO.TIPO, rotulo: 'Tipo de conta definido', feito: !!empresa.tipo_conta, campo: null, secao: null },
    { chave: PASSO_DA_QUALIFICACAO.SINTESE, rotulo: 'Síntese da pesquisa escrita', feito: sinteseEscrita(empresa.notes), campo: CAMPO_DA_EMPRESA.SINTESE, secao: SECAO_DA_EMPRESA.ESTUDO },
  ];
}

export function numerosDoHistorico(dados: DadosDaRelacao | null | undefined): NumerosDoHistorico {
  const oportunidades = dados?.oportunidades ?? [];
  return {
    oportunidades: oportunidades.length,
    ganhos: oportunidades.filter((o) => o.stage === ETAPA_GANHO).length,
    perdas: oportunidades.filter((o) => o.stage === ETAPA_PERDA).length,
    projetos: dados?.projetos.length ?? 0,
  };
}

type NomeDe = (id: string | null) => string;

function tipoDaOportunidade(o: OportunidadeDaRelacao) {
  if (o.stage === ETAPA_GANHO) return TIPO_DE_EVENTO.GANHO;
  if (o.stage === ETAPA_PERDA) return TIPO_DE_EVENTO.PERDA;
  return TIPO_DE_EVENTO.ANDAMENTO;
}

function tituloDaOportunidade(o: OportunidadeDaRelacao): string {
  if (o.stage === ETAPA_PERDA) return `Perda · ${o.discard_reason ? getDiscardReasonLabel(o.discard_reason) : 'sem motivo'}`;
  return etapaDaOportunidade(o.stage);
}

function eventoDaOportunidade(o: OportunidadeDaRelacao, nomeDe: NomeDe): EventoDoHistorico {
  return {
    id: o.id,
    tipo: tipoDaOportunidade(o),
    titulo: tituloDaOportunidade(o),
    detalhe: [o.title, nomeDe(o.owner_id)].filter(Boolean).join(' · '),
    data: o.data,
    href: `/comercial/prospeccao?oportunidade=${encodeURIComponent(o.id)}`,
  };
}

function eventoDoProjeto(p: ProjetoDaRelacao): EventoDoHistorico {
  return { id: p.id, tipo: TIPO_DE_EVENTO.PROJETO, titulo: `Projeto ${p.name}`, detalhe: statusDoProjeto(p.status), data: p.data, href: `/projects/${encodeURIComponent(p.id)}` };
}

/** Oportunidades e projetos, do mais antigo para o mais novo: a linha do tempo corre para a direita. */
export function eventosDoHistorico(dados: DadosDaRelacao | null | undefined, nomeDe: NomeDe): EventoDoHistorico[] {
  const eventos = [
    ...(dados?.oportunidades ?? []).map((o) => eventoDaOportunidade(o, nomeDe)),
    ...(dados?.projetos ?? []).map(eventoDoProjeto),
  ];
  return eventos.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));
}

/** A última Perda, para "Já falamos" e para os riscos. */
export function ultimaPerda(dados: DadosDaRelacao | null | undefined): OportunidadeDaRelacao | null {
  const perdas = (dados?.oportunidades ?? []).filter((o) => o.stage === ETAPA_PERDA);
  return perdas.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))[0] ?? null;
}

function riscoDaSituacao(empresa: EmpresaDaFicha): ItemDeRisco {
  const titulo = 'Situação na Receita';
  if (!empresa.so_no_pulse) return { titulo, valor: 'Ativa', atencao: false };
  const situacao = empresa.situacao_cadastral ?? 'Sem situação';
  return { titulo, valor: situacao.charAt(0).toUpperCase() + situacao.slice(1).toLowerCase(), atencao: !/ativa/i.test(situacao) };
}

function riscoDaDivida(empresa: EmpresaDaFicha): ItemDeRisco {
  const titulo = 'Dívida ativa';
  if (empresa.divida_ajuizada) return { titulo, valor: 'Ajuizada', atencao: true };
  if (empresa.divida_total) return { titulo, valor: 'Inscrita, sem ajuizar', atencao: true };
  return { titulo, valor: 'Sem inscrição', atencao: false };
}

function riscoDoValor(empresa: EmpresaDaFicha): ItemDeRisco {
  const titulo = 'Valor da dívida';
  if (!empresa.divida_total) return { titulo, valor: 'R$ 0', atencao: false };
  const inscricoes = empresa.inscricoes_divida ? `${empresa.inscricoes_divida} ${empresa.inscricoes_divida === 1 ? 'inscrição' : 'inscrições'}` : null;
  const ajuizada = empresa.divida_ajuizada ? `${reaisCurtos(Number(empresa.divida_ajuizada))} ajuizada` : null;
  return { titulo, valor: reaisCurtos(Number(empresa.divida_total)), detalhe: [ajuizada, inscricoes].filter(Boolean).join(' · ') || undefined, atencao: true };
}

/** Os riscos da empresa na Receita (US-0053): situação, dívida ativa e o valor dela. */
export function riscosDaEmpresa(empresa: EmpresaDaFicha): ItemDeRisco[] {
  return [riscoDaSituacao(empresa), riscoDaDivida(empresa), riscoDoValor(empresa)];
}

const MILHAO = 1_000_000;

/** "250" → R$ 250 mi; "1,5" → R$ 1,5 mi. Truncado, nunca arredondado (ADR-0011). */
export function reaisDeMilhoes(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, '');
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(normalizado);
  return limpo && Number.isFinite(n) && n > 0 ? Math.trunc(n * MILHAO) : null;
}

/** "760" ou "1.200" → 760, 1200; vazio ou zero não vale. */
export function inteiroDoTexto(texto: string): number | null {
  const n = Number(texto.replace(/\D/g, ''));
  return n > 0 ? n : null;
}

/** "(37) 3329-1000": a Receita guarda o DDD junto, só com dígitos; fixo tem 10, celular 11. */
export function telefoneDaReceita(numero: string): string {
  const d = numero.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return numero;
}

interface FontesDasPessoas {
  vinculos: ProspectOpportunityContact[];
  contatos: ProspectContactDB[];
  parceiros: ProspectCompanyPartnerDB[];
  sociosDaFicha: SocioDaFicha[];
}

function pessoaDoContato(contato: ContatoDaPessoa, vinculo: ProspectOpportunityContact | null, parceiro: ProspectCompanyPartnerDB | undefined): PessoaDaEmpresa {
  return {
    chave: `contato-${contato.id}`,
    nome: contato.name,
    origem: parceiro ? ORIGEM_DA_PESSOA.RECEITA : ORIGEM_DA_PESSOA.CADASTRADA,
    cargo: parceiro ? cargoNaEmpresa(parceiro.qualificacao) : contato.role,
    contato,
    vinculo,
    socio: null,
  };
}

function pessoaDoParceiro(socio: ProspectCompanyPartnerDB): PessoaDaEmpresa {
  return { chave: `socio-${socio.id}`, nome: emTitulo(socio.nome) || socio.nome, origem: ORIGEM_DA_PESSOA.RECEITA, cargo: cargoNaEmpresa(socio.qualificacao), contato: null, vinculo: null, socio };
}

function pessoaDaFicha(socio: SocioDaFicha): PessoaDaEmpresa {
  return {
    chave: `ficha-${socio.nome}-${socio.entrada}`,
    nome: emTitulo(socio.nome),
    origem: ORIGEM_DA_PESSOA.RECEITA,
    cargo: cargoNaEmpresa(nomeDaQualificacao(socio.qualificacao_codigo)),
    contato: null,
    vinculo: null,
    socio: null,
  };
}

/**
 * As pessoas da empresa numa lista só (US-0053): quem está na Oportunidade, os outros contatos e
 * os sócios ainda não trazidos. Contato que veio do sócio continua sendo da Receita.
 */
export function pessoasDaEmpresa(fontes: FontesDasPessoas): PessoaDaEmpresa[] {
  const { vinculos, contatos, parceiros, sociosDaFicha } = fontes;
  const parceiroDe = new Map(parceiros.filter((p) => p.contact_id).map((p) => [p.contact_id as string, p]));
  const naOportunidade = new Set(vinculos.map((v) => v.contact_id));
  const socios = parceiros.length > 0 ? sociosParaTrazer(parceiros).map(pessoaDoParceiro) : sociosDaFicha.map(pessoaDaFicha);
  return [
    ...vinculos.filter((v) => v.contact).map((v) => pessoaDoContato(v.contact as ContatoDaPessoa, v, parceiroDe.get(v.contact_id))),
    ...contatos.filter((c) => !naOportunidade.has(c.id)).map((c) => pessoaDoContato(c, null, parceiroDe.get(c.id))),
    ...socios,
  ];
}

/** O OneDrive recusa estes caracteres em nome de pasta. */
const PROIBIDOS_NO_ONEDRIVE = /["*:<>?/\\|]/g;

/** "Gecal (20302873000166)": o nome ajuda quem navega no OneDrive; o CNPJ evita homônimos. */
export function nomeDaPastaDaEmpresa(empresa: Pick<ProspectCompanyDB, 'name' | 'cnpj'>): string {
  const nome = empresa.name.replace(PROIBIDOS_NO_ONEDRIVE, ' ').replace(/\s+/g, ' ').trim();
  const cnpj = empresa.cnpj?.replace(/\D/g, '');
  return cnpj ? `${nome} (${cnpj})` : nome;
}

/** "2,4 MB", "830 KB". */
export function tamanhoDoArquivo(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes >= MILHAO) return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} KB`;
}
