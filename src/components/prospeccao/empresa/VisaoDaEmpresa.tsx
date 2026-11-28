import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFaturamentoDoTime, useFuncionariosDoTime } from '@/hooks/useEstudoDaConta';
import { divisaoDoCnae, nomeDoRamo, setorDoCnae, SETORES } from '@/lib/prospecting/cnae';
import { anosDeOperacao, emTitulo, reaisCurtos } from '@/lib/prospecting/empresasReceita';
import { ROTULO_DO_INFORMADO, textoDoFaturamento, textoDoInformado } from '@/lib/prospecting/faturamentoEstimado';
import { CAMPO_DA_EMPRESA, SECAO_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import { emMilhoes, faturamentoDoTime, inteiroDoTexto, numerosDoHistorico, reaisDeMilhoes, ultimaPerda } from '@/lib/prospecting/paginaDaEmpresa';
import { getDiscardReasonLabel } from '@/types/prospect';
import type { EmpresaDaFicha } from '@/types/fichaReceita';
import { EdicaoDoCampo } from './PecasDaPagina';
import { useCampoAberto, useEdicaoDaEmpresa } from './edicaoDaEmpresa';
import type { EmpresaDaPagina } from './useEmpresaDaPagina';

/**
 * Visão geral da empresa em três grupos (US-0053, proposta B de 26/11/2026): Porte, Perfil e Onde e
 * relação. Cada cartão tem um dado principal e linhas de apoio, no padrão de métrica do sistema.
 */

const NUMERO = 'font-mono text-[1.375rem] font-semibold leading-none tabular-nums xl:text-[1.625rem]';
const DESTAQUE = 'line-clamp-2 text-[17px] font-semibold leading-snug';
const APOIO = 'text-[12px] text-muted-foreground';

function Grupo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <section aria-label={rotulo} className="flex min-w-0 flex-col gap-2.5 rounded-xl border bg-card px-[18px] py-3.5">
      <h3 className="ui-label">{rotulo}</h3>
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
function NumeroDoPorte(props: { nome: string; valor: string; origem: string; acao?: ReactNode; edicao?: ReactNode; ancora: React.Ref<HTMLDivElement>; id: string }) {
  const { nome, valor, origem, acao, edicao, ancora, id } = props;
  return (
    <div ref={ancora} id={id} className="grid min-w-0 content-start gap-1">
      <span className={APOIO}>{nome}</span>
      {edicao ?? <span className={`${NUMERO} truncate`} title={valor}>{valor}</span>}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={APOIO}>{origem}</span>
        {acao}
      </span>
    </div>
  );
}

function Funcionarios({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { can } = useAuth();
  const salvar = useFuncionariosDoTime();
  const campo = useCampoAberto(CAMPO_DA_EMPRESA.FUNCIONARIOS);
  const doPulse = pagina.empresaDoPulse;
  const doTime = !!empresa.funcionarios_do_time;
  const acao = doPulse && can('prospeccao:editar') && !campo.aberto && (
    <BotaoDeInformar texto={doTime ? 'Corrigir' : 'Confirmar'} onClick={campo.abrir} />
  );
  // Corrigir abre com o número atual; apagar volta a valer a RAIS.
  const edicao = campo.aberto && doPulse && (
    <EdicaoDoCampo rotulo="Funcionários confirmados" placeholder="Vazio: vale a RAIS" aceitaVazio valorInicial={doTime && empresa.funcionarios != null ? String(empresa.funcionarios) : ''} onSair={campo.fechar}
      onSalvar={(v) => salvar.mutate({ companyId: doPulse.id, funcionarios: inteiroDoTexto(v) })} />
  );
  return (
    <NumeroDoPorte
      ancora={campo.ancora}
      id={`campo-${CAMPO_DA_EMPRESA.FUNCIONARIOS}`}
      nome="Funcionários"
      valor={empresa.funcionarios != null ? empresa.funcionarios.toLocaleString('pt-BR') : '—'}
      origem={doTime ? 'confirmados pelo time' : 'RAIS'}
      acao={acao || undefined}
      edicao={edicao || undefined}
    />
  );
}

interface FaturamentoDaPagina {
  valor: string;
  origem: string;
  /** Valor do time, em milhões, para abrir o campo já preenchido; nulo quando é da Base. */
  doTime: string | null;
}

function faturamentoDaPagina(empresa: EmpresaDaFicha): FaturamentoDaPagina {
  const informado = empresa.faturamento_informado;
  if (informado != null && faturamentoDoTime(empresa.faturamento_informado_base)) {
    const base = empresa.faturamento_informado_base;
    return { valor: textoDoInformado(Number(informado)), origem: base ? ROTULO_DO_INFORMADO[base] : 'informado pelo time', doTime: emMilhoes(Number(informado)) };
  }
  const estimado = empresa.faturamento_estimado ?? informado;
  if (estimado == null) return { valor: '—', origem: 'sem estimativa', doTime: null };
  // O "estimado pela base" já diz que é aproximado; sem o "≈" o valor cabe melhor.
  const texto = empresa.faturamento_base ? textoDoFaturamento(Number(estimado), empresa.faturamento_base).replace(/^≈\s*/, '') : textoDoInformado(Number(estimado));
  return { valor: texto, origem: 'estimado pela base', doTime: null };
}

function Faturamento({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { can } = useAuth();
  const salvar = useFaturamentoDoTime();
  const campo = useCampoAberto(CAMPO_DA_EMPRESA.FATURAMENTO);
  const doPulse = pagina.empresaDoPulse;
  const { valor, origem, doTime } = faturamentoDaPagina(empresa);
  const salvarValor = (texto: string) => {
    const reais = reaisDeMilhoes(texto);
    if (doPulse && reais) salvar.mutate({ companyId: doPulse.id, valor: reais });
  };
  const acao = doPulse && can('prospeccao:editar') && !campo.aberto && (
    <BotaoDeInformar texto={doTime ? 'Corrigir' : 'Informar'} onClick={campo.abrir} />
  );
  const edicao = campo.aberto && (
    <EdicaoDoCampo rotulo="Faturamento anual, em milhões de reais" placeholder="Em R$ mi, ex.: 250" valorInicial={doTime ?? ''} onSalvar={salvarValor} onSair={campo.fechar} />
  );
  return (
    <NumeroDoPorte ancora={campo.ancora} id={`campo-${CAMPO_DA_EMPRESA.FATURAMENTO}`} nome="Faturamento" valor={valor} origem={origem} acao={acao || undefined} edicao={edicao || undefined} />
  );
}

function Porte({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const regime = empresa.regime_tributario ?? pagina.empresaDoPulse?.regime_tributario ?? null;
  const ano = empresa.regime_tributario_ano ?? pagina.empresaDoPulse?.regime_tributario_ano ?? null;
  const textoDoRegime = regime ? [emTitulo(regime), ano && String(ano)].filter(Boolean).join(' · ') : 'Não consultado';
  return (
    <Grupo rotulo="Porte">
      <div className="grid grid-cols-2 gap-4">
        <Faturamento pagina={pagina} empresa={empresa} />
        <Funcionarios pagina={pagina} empresa={empresa} />
      </div>
      <Linhas itens={[['Capital social', empresa.capital_social ? reaisCurtos(Number(empresa.capital_social)) : '—'], ['Regime', textoDoRegime]]} />
    </Grupo>
  );
}

function Perfil({ empresa }: { empresa: EmpresaDaFicha }) {
  const setor = SETORES.find((s) => s.letra === setorDoCnae(empresa.cnae_principal))?.nome;
  const ramo = nomeDoRamo(divisaoDoCnae(empresa.cnae_principal));
  const anos = anosDeOperacao(empresa.data_inicio_atividade);
  const idade = anos != null ? `${anos} ${anos === 1 ? 'ano' : 'anos'}${empresa.data_inicio_atividade ? ` · ${empresa.data_inicio_atividade.slice(0, 4)}` : ''}` : '—';
  return (
    <Grupo rotulo="Perfil">
      <div className="grid gap-0.5">
        <span className={DESTAQUE} title={empresa.cnae_descricao ?? undefined}>{empresa.cnae_descricao ?? '—'}</span>
        <span className={`${APOIO} truncate`}>{[setor, ramo].filter(Boolean).join(' · ')}</span>
      </div>
      <Linhas itens={[['Idade', idade], ['Natureza', <span key="n" title={empresa.natureza_descricao ?? undefined}>{empresa.natureza_descricao ?? '—'}</span>]]} />
    </Grupo>
  );
}

function OndeERelacao({ pagina, empresa }: { pagina: EmpresaDaPagina; empresa: EmpresaDaFicha }) {
  const { mostrar } = useEdicaoDaEmpresa();
  const historico = pagina.ficha.data?.historico;
  const { oportunidades } = numerosDoHistorico(historico);
  const perda = ultimaPerda(historico);
  const cidade = [emTitulo(empresa.municipio), empresa.uf].filter(Boolean).join(' · ');
  const vezes = oportunidades === 0 ? 'Nunca' : `${oportunidades} ${oportunidades === 1 ? 'vez' : 'vezes'}`;
  const ultima = perda ? `Perda${perda.data ? ` em ${perda.data.slice(0, 4)}` : ''} · ${perda.discard_reason ? getDiscardReasonLabel(perda.discard_reason) : 'sem motivo'}` : '—';
  const jaFalamos = (
    <button type="button" onClick={() => mostrar(SECAO_DA_EMPRESA.HISTORICO)} className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {vezes}
    </button>
  );
  return (
    <Grupo rotulo="Onde e relação">
      <div className="grid gap-0.5">
        <span className={DESTAQUE}>{cidade || '—'}</span>
        <span className={APOIO}>{empresa.distancia_km != null ? `${empresa.distancia_km.toLocaleString('pt-BR')} km de distância` : ' '}</span>
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
