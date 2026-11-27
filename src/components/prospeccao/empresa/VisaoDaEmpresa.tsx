import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInformarFaturamento, useInformarFuncionarios } from '@/hooks/usePaginaDaEmpresa';
import { rotuloDaFaixa } from '@/lib/prospecting/funcionariosDoTime';
import { coberturaDaRais } from '@/lib/prospecting/raisImprovavel';
import { divisaoDoCnae, nomeDoRamo, setorDoCnae, SETORES } from '@/lib/prospecting/cnae';
import { BASE_PISO, textoDoFaturamento, textoDoInformado } from '@/lib/prospecting/faturamentoEstimado';
import { faixaDoFaturamento, faixaDosFuncionarios, faturamentoEmFaixa, faturamentoInformadoPeloTime } from '@/lib/prospecting/faixasDeFaturamento';
import { CAMPO_DA_EMPRESA, SECAO_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import { TEMA_DO_PORTE, TIPO_DE_PROPOSTA } from '@/lib/prospecting/insights.constants';
import {
  ATALHOS_DO_LINKEDIN,
  faixaDePessoas,
  faixaEmReais,
  faturamentoInformado,
  funcionariosInformados,
  numerosDoHistorico,
  origemDoTime,
  textoDaCidade,
  textoDaDistancia,
  textoDaIdade,
  textoDaUltimaPerda,
  textoDoCapital,
  textoDoRegime,
  ultimaPerda,
  vezesQueFalamos,
  UNIDADE_EM_MILHOES,
  UNIDADE_EM_PESSOAS,
} from '@/lib/prospecting/paginaDaEmpresa';
import type { EmpresaDaFicha } from '@/types/fichaReceita';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { InformadoPeloTime } from '@/types/paginaDaEmpresa';
import { InformarDoTimeDialog } from './InformarDoTimeDialog';
import { AcaoDoTema } from './PecasDosInsights';
import { PropostaNoPorte } from './PropostaNoPorte';
import { useCampoAberto, useEdicaoDaEmpresa } from './edicaoDaEmpresa';
import type { EmpresaDaPagina } from './useEmpresaDaPagina';

/**
 * Visão geral da empresa em três grupos (US-0053, proposta B de 26/11/2026): Porte, Perfil e Onde e
 * relação. Cada cartão tem um dado principal e linhas de apoio, no padrão de métrica do sistema.
 */

const NUMERO = 'font-mono text-[1.375rem] font-semibold leading-none tabular-nums xl:text-[1.625rem]';
/** Faixa ("R$ 300 a 500 mi"): um pouco menor e quebrando, para não cortar no cartão (US-0056). */
const FAIXA = 'font-mono text-[1.125rem] font-semibold leading-tight tabular-nums';
const DESTAQUE = 'line-clamp-2 text-[17px] font-semibold leading-snug';
const APOIO = 'text-[12px] text-muted-foreground';

function Grupo({ rotulo, acao, children }: { rotulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={rotulo} className="flex min-w-0 flex-col gap-2.5 rounded-xl border bg-card px-[18px] py-3.5">
      <div className="flex items-center gap-2">
        <h3 className="ui-label">{rotulo}</h3>
        {acao && <span className="ml-auto">{acao}</span>}
      </div>
      {children}
    </section>
  );
}

/** Linhas de apoio: rótulo à esquerda, valor à direita. */
function Linhas({ itens }: { itens: Array<[string, ReactNode]> }) {
  return (
    <dl className="mt-auto grid gap-1.5 border-t pt-2.5 text-[13px]">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="shrink-0 text-muted-foreground">{rotulo}</dt>
          <dd className="min-w-0 truncate text-right font-semibold">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function BotaoDeInformar({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-sm text-[12px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Pencil className="h-3 w-3" aria-hidden="true" />
      {texto}
    </button>
  );
}

/** Um número do porte: o nome em cima, o valor e, embaixo, de onde vem e a ação. Os dois números alinham. */
function NumeroDoPorte(props: { nome: string; valor: string; emFaixa?: boolean; origem: string; acao?: ReactNode; edicao?: ReactNode; proposta?: ReactNode; ancora: React.Ref<HTMLDivElement>; id: string }) {
  const { nome, valor, emFaixa = false, origem, acao, edicao, proposta, ancora, id } = props;
  return (
    <div ref={ancora} id={id} className="grid min-w-0 content-start gap-1">
      <span className={APOIO}>{nome}</span>
      {edicao ?? <span className={emFaixa ? FAIXA : `${NUMERO} truncate`} title={valor}>{valor}</span>}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={APOIO}>{origem}</span>
        {acao}
      </span>
      {proposta}
    </div>
  );
}

const numeroDeFuncionarios = (empresa: EmpresaDaFicha) => (empresa.funcionarios != null ? empresa.funcionarios.toLocaleString('pt-BR') : '—');

/** RAIS improvável (US-0054): a faixa da estimativa, com a RAIS no detalhe. */
function funcionariosEstimadosNaPagina(empresa: EmpresaDaFicha) {
  const rais = (empresa.funcionarios_rais ?? 0).toLocaleString('pt-BR');
  return { valor: faixaDosFuncionarios(empresa.funcionarios ?? 0), origem: `estimado · RAIS ${rais}`, emFaixa: true };
}

function funcionariosDoTimeNaPagina(empresa: EmpresaDaFicha) {
  const origem = origemDoTime(empresa.funcionarios_base, empresa.funcionarios_confianca);
  const { funcionarios_min: de, funcionarios_max: ate } = empresa;
  if (de != null && ate != null) return { valor: faixaDePessoas(de, ate), origem, emFaixa: true };
  return { valor: numeroDeFuncionarios(empresa), origem };
}

/** Funcionários: o que o time informou (faixa ou número), a estimativa da RAIS improvável, ou a RAIS. */
function funcionariosDaPagina(empresa: EmpresaDaFicha): { valor: string; origem: string; emFaixa?: boolean } {
  const legado = rotuloDaFaixa(empresa.funcionarios_faixa);
  if (legado) return { valor: legado, origem: 'LinkedIn · informado pelo time', emFaixa: true };
  if (empresa.funcionarios_do_time) return funcionariosDoTimeNaPagina(empresa);
  if (empresa.funcionarios_estimados) return funcionariosEstimadosNaPagina(empresa);
  return { valor: numeroDeFuncionarios(empresa), origem: coberturaDaRais(empresa) ?? 'RAIS' };
}

interface ModalDoPorteProps {
  doPulse: ProspectCompanyDB;
  /** O que a página mostra hoje, no topo do modal. */
  atual: string;
  aberto: boolean;
  onAbrir: () => void;
  onFechar: () => void;
}

/** O modal dos funcionários, com as faixas do LinkedIn como atalho e "Voltar à RAIS". */
function ModalDeFuncionarios(props: ModalDoPorteProps) {
  const { doPulse, atual, aberto, onAbrir, onFechar } = props;
  const salvar = useInformarFuncionarios();
  const inicial = funcionariosInformados(doPulse);
  const gravar = (informado: InformadoPeloTime | null) => salvar.mutate({ id: doPulse.id, informado }, { onSuccess: onFechar });
  return (
    <InformarDoTimeDialog
      aberto={aberto}
      onAbertoChange={(a) => (a ? onAbrir() : onFechar())}
      titulo="Informar funcionários"
      atual={atual}
      unidade={UNIDADE_EM_PESSOAS}
      atalhos={ATALHOS_DO_LINKEDIN}
      inicial={inicial}
      pendente={salvar.isPending}
      onSalvar={gravar}
      textoDeLimpar="Voltar à RAIS"
      onLimpar={inicial ? () => gravar(null) : undefined}
    />
  );
}

function Funcionarios({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { can } = useAuth();
  const campo = useCampoAberto(CAMPO_DA_EMPRESA.FUNCIONARIOS);
  const doPulse = can('prospeccao:editar') ? pagina.empresaDoPulse : null;
  const { valor, origem, emFaixa } = funcionariosDaPagina(empresa);
  const texto = empresa.funcionarios_do_time ? 'Corrigir' : 'Informar';
  return (
    <>
      <NumeroDoPorte
        ancora={campo.ancora}
        id={`campo-${CAMPO_DA_EMPRESA.FUNCIONARIOS}`}
        nome="Funcionários"
        valor={valor}
        emFaixa={emFaixa}
        origem={origem}
        acao={doPulse ? <BotaoDeInformar texto={texto} onClick={campo.abrir} /> : undefined}
        proposta={pagina.empresaDoPulse && <PropostaNoPorte companyId={pagina.empresaDoPulse.id} tipo={TIPO_DE_PROPOSTA.FUNCIONARIOS} />}
      />
      {doPulse && <ModalDeFuncionarios doPulse={doPulse} atual={`${valor} · ${origem}`} aberto={campo.aberto} onAbrir={campo.abrir} onFechar={campo.fechar} />}
    </>
  );
}

interface FaturamentoDaPagina {
  valor: string;
  origem: string;
  emFaixa?: boolean;
}

/** O faturamento do time: a faixa informada ou o valor, com origem e confiança (US-0056). */
function faturamentoDoTimeNaPagina(empresa: EmpresaDaFicha): FaturamentoDaPagina {
  const origem = origemDoTime(empresa.faturamento_informado_base, empresa.faturamento_confianca);
  const { faturamento_min: de, faturamento_max: ate } = empresa;
  if (de != null && ate != null) return { valor: faixaEmReais(Number(de), Number(ate)), origem, emFaixa: true };
  return { valor: textoDoInformado(Number(empresa.faturamento_informado)), origem };
}

function faturamentoDaPagina(empresa: EmpresaDaFicha): FaturamentoDaPagina {
  if (faturamentoInformadoPeloTime(empresa)) return faturamentoDoTimeNaPagina(empresa);
  const estimado = empresa.faturamento_estimado ?? empresa.faturamento_informado;
  if (estimado == null) return { valor: '—', origem: 'sem estimativa' };
  const emFaixa = empresa.faturamento_base !== BASE_PISO && faturamentoEmFaixa(empresa);
  return { valor: textoDoEstimado(empresa, Number(estimado)), origem: origemDoEstimado(empresa), emFaixa };
}

/**
 * O estimado em faixa fixa (US-0056); o piso continua "acima de R$ 4,8 mi"; com o número exato de
 * funcionários do time, valor único.
 */
function textoDoEstimado(empresa: EmpresaDaFicha, valor: number): string {
  const base = empresa.faturamento_base;
  if (base === BASE_PISO) return textoDoFaturamento(valor, base);
  if (faturamentoEmFaixa(empresa)) return faixaDoFaturamento(valor);
  return base ? textoDoFaturamento(valor, base).replace(/^≈\s*/, '') : textoDoInformado(valor);
}

function origemDoEstimado(empresa: EmpresaDaFicha): string {
  if (empresa.funcionarios_do_time) return 'pelos funcionários do time';
  return 'estimado pela base';
}

function ModalDeFaturamento(props: ModalDoPorteProps) {
  const { doPulse, atual, aberto, onAbrir, onFechar } = props;
  const salvar = useInformarFaturamento();
  return (
    <InformarDoTimeDialog
      aberto={aberto}
      onAbertoChange={(a) => (a ? onAbrir() : onFechar())}
      titulo="Informar faturamento anual"
      atual={atual}
      unidade={UNIDADE_EM_MILHOES}
      inicial={faturamentoInformado(doPulse)}
      pendente={salvar.isPending}
      onSalvar={(informado) => salvar.mutate({ id: doPulse.id, informado }, { onSuccess: onFechar })}
    />
  );
}

function Faturamento({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { can } = useAuth();
  const campo = useCampoAberto(CAMPO_DA_EMPRESA.FATURAMENTO);
  const doPulse = can('prospeccao:editar') ? pagina.empresaDoPulse : null;
  const { valor, origem, emFaixa } = faturamentoDaPagina(empresa);
  const texto = faturamentoInformadoPeloTime(empresa) ? 'Corrigir' : 'Informar';
  return (
    <>
      <NumeroDoPorte
        ancora={campo.ancora}
        id={`campo-${CAMPO_DA_EMPRESA.FATURAMENTO}`}
        nome="Faturamento"
        valor={valor}
        emFaixa={emFaixa}
        origem={origem}
        acao={doPulse ? <BotaoDeInformar texto={texto} onClick={campo.abrir} /> : undefined}
        proposta={pagina.empresaDoPulse && <PropostaNoPorte companyId={pagina.empresaDoPulse.id} tipo={TIPO_DE_PROPOSTA.FATURAMENTO} />}
      />
      {doPulse && <ModalDeFaturamento doPulse={doPulse} atual={`${valor} · ${origem}`} aberto={campo.aberto} onAbrir={campo.abrir} onFechar={campo.fechar} />}
    </>
  );
}

function Porte({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const doPulse = pagina.empresaDoPulse;
  return (
    <Grupo rotulo="Porte" acao={doPulse && <AcaoDoTema companyId={doPulse.id} tema={TEMA_DO_PORTE} jaTem={false} />}>
      <div className="grid grid-cols-2 gap-4">
        <Faturamento pagina={pagina} empresa={empresa} />
        <Funcionarios pagina={pagina} empresa={empresa} />
      </div>
      <Linhas itens={[['Capital social', textoDoCapital(empresa)], ['Regime', textoDoRegime(empresa, pagina.empresaDoPulse)]]} />
    </Grupo>
  );
}

function Perfil({ empresa }: { empresa: EmpresaDaFicha }) {
  const setor = SETORES.find((s) => s.letra === setorDoCnae(empresa.cnae_principal))?.nome;
  const ramo = nomeDoRamo(divisaoDoCnae(empresa.cnae_principal));
  const descricao = empresa.cnae_descricao ?? '—';
  const natureza = empresa.natureza_descricao ?? '—';
  return (
    <Grupo rotulo="Perfil">
      <div className="grid gap-0.5">
        <span className={DESTAQUE} title={descricao}>{descricao}</span>
        <span className={`${APOIO} truncate`}>{[setor, ramo].filter(Boolean).join(' · ')}</span>
      </div>
      <Linhas itens={[['Idade', textoDaIdade(empresa.data_inicio_atividade)], ['Natureza', <span key="n" title={natureza}>{natureza}</span>]]} />
    </Grupo>
  );
}

function OndeERelacao({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { mostrar } = useEdicaoDaEmpresa();
  const historico = pagina.ficha.data?.historico;
  const vezes = vezesQueFalamos(numerosDoHistorico(historico).oportunidades);
  const ultima = textoDaUltimaPerda(ultimaPerda(historico));
  const jaFalamos = (
    <button type="button" onClick={() => mostrar(SECAO_DA_EMPRESA.HISTORICO)} className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {vezes}
    </button>
  );
  return (
    <Grupo rotulo="Onde e relação">
      <div className="grid gap-0.5">
        <span className={DESTAQUE}>{textoDaCidade(empresa)}</span>
        <span className={APOIO}>{textoDaDistancia(empresa.distancia_km)}</span>
      </div>
      <Linhas itens={[['Já falamos', jaFalamos], ['Última', <span key="u" title={ultima}>{ultima}</span>]]} />
    </Grupo>
  );
}

/** Os três grupos da visão geral, fixos acima das abas. */
export function VisaoDaEmpresa(props: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { pagina, empresa } = props;
  return (
    <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr]">
      <Porte pagina={pagina} empresa={empresa} />
      <Perfil empresa={empresa} />
      <OndeERelacao pagina={pagina} empresa={empresa} />
    </div>
  );
}
