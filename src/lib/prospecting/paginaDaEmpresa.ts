import { etapaDaOportunidade, statusDoProjeto } from '@/lib/prospecting/relacao';
import { anosDeOperacao, emTitulo, reaisCurtos } from '@/lib/prospecting/empresasReceita';
import { sociosParaTrazer } from '@/lib/prospecting/estudoDaConta';
import { cargoNaEmpresa, nomeDaQualificacao } from '@/lib/prospecting/qualificacoesDeSocio';
import { getDiscardReasonLabel, type ProspectCompanyDB, type ProspectContactDB, type ProspectOpportunityContact, type ProspectWithCompany } from '@/types/prospect';
import type { ProspectCompanyPartnerDB } from '@/types/receita';
import type { EmpresaDaFicha, SocioDaFicha } from '@/types/fichaReceita';
import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { textoDoInformado } from '@/lib/prospecting/faturamentoEstimado';
import { rotuloDaFaixa } from '@/lib/prospecting/funcionariosDoTime';
import type { DadosDaRelacao, OportunidadeDaRelacao, ProjetoDaRelacao } from '@/types/relacao';
import type { AtalhoDeFaixa, ContatoDaPessoa, EventoDoHistorico, InformadoPeloTime, ItemDeRisco, NumerosDoHistorico, PassoDoWidget, PessoaDaEmpresa, UnidadeDoCampo } from '@/types/paginaDaEmpresa';
import { CONFIANCA_DO_TIME, FAIXAS_DO_LINKEDIN, ORIGEM_DO_TIME, type ConfiancaDoTime, type OrigemDoTime } from '@/lib/prospecting/funcionarios.constants';
import { valuesAreHidden } from '@/lib/hideValuesStore';
import { HIDDEN_VALUE_MASK } from '@/lib/formatters';
import { cidadeEUf } from '@/lib/prospecting/cidade';
import {
  CAMPO_DA_EMPRESA,
  ETAPA_GANHO,
  ETAPA_PERDA,
  FATURAMENTO_DA_BASE,
  ORIGEM_DA_PESSOA,
  PASSO_DA_QUALIFICACAO,
  SECAO_DA_EMPRESA,
  TIPO_DE_EVENTO,
} from './faseDaEmpresa.constants';

/**
 * Regras da página da empresa (US-0053): os passos da qualificação, o histórico com a Origami e
 * os riscos. Os passos só orientam; quem decide criar a Oportunidade é quem estudou a empresa.
 */

const DECISOR = 'decisor';

/** O faturamento veio do time (estimado ou apurado), não do cálculo da Base guardado ao mover. */
export function faturamentoDoTime(base: string | null | undefined): boolean {
  return !!base && base !== FATURAMENTO_DA_BASE;
}

/** "250" para R$ 250 mi: o valor como se digita no campo de faturamento. */
export function emMilhoes(reais: number): string {
  return (reais / MILHAO).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** `estudoGerado`: os quatro blocos do Estudo da conta têm uma versão gerada (US-0057). */
export function passosDaQualificacao(empresa: ProspectCompanyDB, oportunidade: ProspectWithCompany, estudoGerado: boolean): PassoDoWidget[] {
  const temDecisor = (oportunidade.contacts ?? []).some((c) => c.role === DECISOR);
  return [
    { chave: PASSO_DA_QUALIFICACAO.SITE, rotulo: 'Site informado', feito: !!empresa.website, campo: CAMPO_DA_EMPRESA.SITE, secao: SECAO_DA_EMPRESA.CANAIS },
    { chave: PASSO_DA_QUALIFICACAO.LINKEDIN, rotulo: 'LinkedIn informado', feito: !!empresa.linkedin_url, campo: CAMPO_DA_EMPRESA.LINKEDIN, secao: SECAO_DA_EMPRESA.CANAIS },
    { chave: PASSO_DA_QUALIFICACAO.DECISOR, rotulo: 'Decisor mapeado', feito: temDecisor, campo: null, secao: SECAO_DA_EMPRESA.PESSOAS },
    { chave: PASSO_DA_QUALIFICACAO.FATURAMENTO, rotulo: 'Faturamento informado', feito: empresa.faturamento_anual != null && faturamentoDoTime(empresa.faturamento_anual_base), campo: CAMPO_DA_EMPRESA.FATURAMENTO, secao: null },
    { chave: PASSO_DA_QUALIFICACAO.TIPO, rotulo: 'Tipo de conta definido', feito: !!empresa.tipo_conta, campo: null, secao: null },
    { chave: PASSO_DA_QUALIFICACAO.ESTUDO, rotulo: 'Estudo da conta gerado', feito: estudoGerado, campo: null, secao: SECAO_DA_EMPRESA.ESTUDO },
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

// ---------- o que o time informa (US-0056) ----------

const ESCALA_DA_FAIXA: ReadonlyArray<[number, string]> = [[1e9, 'bi'], [1e6, 'mi'], [1e3, 'mil']];
const naEscala = (v: number) => ESCALA_DA_FAIXA.find(([limite]) => v >= limite) ?? [1, ''];
const numeroCurto = (v: number, limite: number) => (Math.trunc((v / limite) * 10) / 10).toLocaleString('pt-BR');

/** "R$ 700 a 900 mi"; "R$ 800 mi a 1,2 bi" quando muda a escala. */
export function faixaEmReais(de: number, ate: number): string {
  if (valuesAreHidden()) return HIDDEN_VALUE_MASK;
  const [limiteDe, unidadeDe] = naEscala(de);
  const [limiteAte, unidadeAte] = naEscala(ate);
  if (unidadeDe === unidadeAte) return `R$ ${numeroCurto(de, limiteDe)} a ${numeroCurto(ate, limiteAte)} ${unidadeAte}`.trim();
  return `R$ ${numeroCurto(de, limiteDe)} ${unidadeDe} a ${numeroCurto(ate, limiteAte)} ${unidadeAte}`;
}

/** "4.000 a 5.000". */
export const faixaDePessoas = (de: number, ate: number) => `${de.toLocaleString('pt-BR')} a ${ate.toLocaleString('pt-BR')}`;

/** "estimado pelo time · confiança média" ou "apurado pelo time". */
export function origemDoTime(base: string | null | undefined, confianca: string | null | undefined): string {
  const quem = base === ORIGEM_DO_TIME.APURADO ? 'apurado pelo time' : 'estimado pelo time';
  const rotulo = CONFIANCA_DO_TIME.find((c) => c.valor === confianca)?.rotulo.toLowerCase();
  return rotulo ? `${quem} · confiança ${rotulo}` : quem;
}

const comoOrigem = (base: string | null | undefined): OrigemDoTime => (base === ORIGEM_DO_TIME.APURADO ? ORIGEM_DO_TIME.APURADO : ORIGEM_DO_TIME.ESTIMADO);
const comoConfianca = (c: string | null | undefined) => (CONFIANCA_DO_TIME.find((x) => x.valor === c)?.valor ?? null) as ConfiancaDoTime | null;

/** O faturamento que o time já informou, para abrir o modal preenchido; nulo sem valor do time. */
export function faturamentoInformado(e: ProspectCompanyDB): InformadoPeloTime | null {
  if (e.faturamento_anual == null || !faturamentoDoTime(e.faturamento_anual_base)) return null;
  const valor = Number(e.faturamento_anual);
  return {
    de: Number(e.faturamento_min ?? valor), ate: Number(e.faturamento_max ?? valor),
    origem: comoOrigem(e.faturamento_anual_base), confianca: comoConfianca(e.faturamento_confianca), fonte: e.faturamento_fonte ?? null,
  };
}

/** Os funcionários que o time já informou, para abrir o modal preenchido. */
export function funcionariosInformados(e: ProspectCompanyDB): InformadoPeloTime | null {
  if (e.funcionarios_informados == null) return null;
  return {
    de: e.funcionarios_min ?? e.funcionarios_informados, ate: e.funcionarios_max ?? e.funcionarios_informados,
    origem: comoOrigem(e.funcionarios_base), confianca: comoConfianca(e.funcionarios_confianca), fonte: e.funcionarios_fonte ?? null,
  };
}

/** Faturamento no modal: em milhões de reais. */
export const UNIDADE_EM_MILHOES: UnidadeDoCampo = { prefixo: 'R$', sufixo: 'mi', ler: (t) => reaisDeMilhoes(t), escrever: (v) => emMilhoes(v) };

/** Funcionários no modal: pessoas. */
export const UNIDADE_EM_PESSOAS: UnidadeDoCampo = { sufixo: 'pessoas', ler: (t) => inteiroDoTexto(t), escrever: (v) => String(v) };

/** As faixas do LinkedIn como atalhos do modal de funcionários. */
export const ATALHOS_DO_LINKEDIN: ReadonlyArray<AtalhoDeFaixa> = FAIXAS_DO_LINKEDIN.map((f) => ({ rotulo: f.rotulo, de: f.de, ate: f.ate }));

// ---------- textos da visão geral (US-0053), em funções pequenas ----------

const regimeDe = (empresa: EmpresaDaFicha, doPulse: ProspectCompanyDB | null) => empresa.regime_tributario ?? doPulse?.regime_tributario ?? null;
const anoDoRegimeDe = (empresa: EmpresaDaFicha, doPulse: ProspectCompanyDB | null) => empresa.regime_tributario_ano ?? doPulse?.regime_tributario_ano ?? null;

/** "Lucro Real · 2024", ou "Não consultado". */
export function textoDoRegime(empresa: EmpresaDaFicha, doPulse: ProspectCompanyDB | null): string {
  const regime = regimeDe(empresa, doPulse);
  if (!regime) return 'Não consultado';
  const ano = anoDoRegimeDe(empresa, doPulse);
  return [emTitulo(regime), ano && String(ano)].filter(Boolean).join(' · ');
}

export const textoDoCapital = (empresa: EmpresaDaFicha) => (empresa.capital_social ? reaisCurtos(Number(empresa.capital_social)) : '—');

/** "42 anos · 1984". */
export function textoDaIdade(abertura: string | null): string {
  const anos = anosDeOperacao(abertura);
  if (anos == null) return '—';
  const desde = abertura ? ` · ${abertura.slice(0, 4)}` : '';
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}${desde}`;
}

/** "Nunca", "1 vez", "3 vezes". */
export function vezesQueFalamos(oportunidades: number): string {
  if (oportunidades === 0) return 'Nunca';
  return `${oportunidades} ${oportunidades === 1 ? 'vez' : 'vezes'}`;
}

/** "Perda em 2025 · Sem orçamento". */
export function textoDaUltimaPerda(perda: OportunidadeDaRelacao | null): string {
  if (!perda) return '—';
  const quando = perda.data ? ` em ${perda.data.slice(0, 4)}` : '';
  const motivo = perda.discard_reason ? getDiscardReasonLabel(perda.discard_reason) : 'sem motivo';
  return `Perda${quando} · ${motivo}`;
}

export const textoDaCidade = (empresa: EmpresaDaFicha) => cidadeEUf(empresa.municipio, empresa.uf) || '—';
export const textoDaDistancia = (km: number | null) => (km != null ? `${km.toLocaleString('pt-BR')} km de distância` : ' ');

/** O faturamento do time como aparece: a faixa informada ou o valor (US-0056). */
export function textoDoFaturamentoDoTime(e: Pick<EmpresaReceita, 'faturamento_informado' | 'faturamento_min' | 'faturamento_max'>): string {
  const { faturamento_min: de, faturamento_max: ate } = e;
  if (de != null && ate != null) return faixaEmReais(Number(de), Number(ate));
  return textoDoInformado(Number(e.faturamento_informado));
}

/** Os funcionários do time como aparecem: a faixa informada (ou a antiga do LinkedIn) ou o número. */
export function textoDosFuncionariosDoTime(e: Pick<EmpresaReceita, 'funcionarios' | 'funcionarios_min' | 'funcionarios_max' | 'funcionarios_faixa'>): string {
  const { funcionarios_min: de, funcionarios_max: ate } = e;
  if (de != null && ate != null) return faixaDePessoas(de, ate);
  return rotuloDaFaixa(e.funcionarios_faixa) ?? (e.funcionarios ?? 0).toLocaleString('pt-BR');
}
